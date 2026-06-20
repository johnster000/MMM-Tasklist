/* MMM-TaskList / node_helper.js
 *
 * Responsibilities:
 *  - Persist users + tasks to a JSON file on disk
 *  - Append a line to a log file whenever a task is completed
 *  - Run a SEPARATE express server (own port) for the admin portal,
 *    independent of the MagicMirror's own this.expressApp/port
 *  - Push state to the front-end module via socket notifications
 */

const NodeHelper = require("node_helper");
const express = require("express");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({

	// ---- lifecycle -------------------------------------------------

	start: function () {
		this.dataDir = path.join(this.path, "data");
		this.tasksFile = path.join(this.dataDir, "tasks.json");
		this.logFile = path.join(this.dataDir, "completed.log");
		this.adminServer = null;

		this.ensureDataFiles();
		console.log(`[MMM-TaskList] node_helper started, data dir: ${this.dataDir}`);
	},

	// Called once the front-end module sends its config via socketNotificationReceived
	socketNotificationReceived: function (notification, payload) {
		if (notification === "TASKLIST_INIT") {
			this.config = payload; // module config, includes adminPort
			this.startAdminServer();
			this.sendState();
		}

		if (notification === "TASKLIST_GET_STATE") {
			this.sendState();
		}

		if (notification === "TASKLIST_COMPLETE_TASK") {
			const taskId = payload && payload.taskId;
			const data = this.readData();
			const task = data.tasks.find(t => t.id === taskId);
			if (task) {
				const user = data.users.find(u => u.id === task.userId);
				this.appendLog(`COMPLETED\t${user ? user.name : task.userId}\t${task.text}`);
				data.tasks = data.tasks.filter(t => t.id !== taskId);
				this.writeData(data);
				this.sendState();
			}
		}
	},

	// ---- data helpers -------------------------------------------------

	ensureDataFiles: function () {
		if (!fs.existsSync(this.dataDir)) {
			fs.mkdirSync(this.dataDir, { recursive: true });
		}
		if (!fs.existsSync(this.tasksFile)) {
			const initial = { users: [], tasks: [] };
			fs.writeFileSync(this.tasksFile, JSON.stringify(initial, null, 2));
		}
		if (!fs.existsSync(this.logFile)) {
			fs.writeFileSync(this.logFile, "");
		}
	},

	readData: function () {
		try {
			const raw = fs.readFileSync(this.tasksFile, "utf8");
			return JSON.parse(raw);
		} catch (err) {
			console.error("[MMM-TaskList] Failed to read tasks.json:", err);
			return { users: [], tasks: [] };
		}
	},

	writeData: function (data) {
		try {
			fs.writeFileSync(this.tasksFile, JSON.stringify(data, null, 2));
			return true;
		} catch (err) {
			console.error("[MMM-TaskList] Failed to write tasks.json:", err);
			return false;
		}
	},

	appendLog: function (line) {
		const timestamp = new Date().toISOString();
		fs.appendFileSync(this.logFile, `${timestamp}\t${line}\n`);
	},

	// Push current users/tasks to the display module
	sendState: function () {
		const data = this.readData();
		this.sendSocketNotification("TASKLIST_STATE", data);
	},

	// ---- admin server -------------------------------------------------

	startAdminServer: function () {
		if (this.adminServer) {
			return; // already running
		}

		const port = (this.config && this.config.adminPort) || 8081;
		const app = express();

		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));

		// Serve the admin UI (static HTML/JS/CSS)
		app.use("/", express.static(path.join(this.path, "admin", "public")));

		// ---- API routes ----

		// Get everything (users + tasks)
		app.get("/api/state", (req, res) => {
			res.json(this.readData());
		});

		// Add a user
		app.post("/api/users", (req, res) => {
			const name = (req.body && req.body.name || "").trim();
			if (!name) {
				return res.status(400).json({ error: "name is required" });
			}
			const data = this.readData();
			const id = Date.now().toString(36);
			data.users.push({ id, name });
			this.writeData(data);
			this.sendState();
			res.json({ ok: true, user: { id, name } });
		});

		// Remove a user (and their tasks)
		app.delete("/api/users/:id", (req, res) => {
			const data = this.readData();
			data.users = data.users.filter(u => u.id !== req.params.id);
			data.tasks = data.tasks.filter(t => t.userId !== req.params.id);
			this.writeData(data);
			this.sendState();
			res.json({ ok: true });
		});

		// Add a task assigned to a user
		app.post("/api/tasks", (req, res) => {
			const userId = req.body && req.body.userId;
			const text = (req.body && req.body.text || "").trim();
			if (!userId || !text) {
				return res.status(400).json({ error: "userId and text are required" });
			}
			const data = this.readData();
			const userExists = data.users.some(u => u.id === userId);
			if (!userExists) {
				return res.status(404).json({ error: "no such user" });
			}
			const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
			data.tasks.push({ id, userId, text, done: false, createdAt: new Date().toISOString() });
			this.writeData(data);
			this.sendState();
			res.json({ ok: true });
		});

		// Mark a task complete -> it disappears from the display, gets logged
		app.post("/api/tasks/:id/complete", (req, res) => {
			const data = this.readData();
			const task = data.tasks.find(t => t.id === req.params.id);
			if (!task) {
				return res.status(404).json({ error: "no such task" });
			}
			const user = data.users.find(u => u.id === task.userId);
			this.appendLog(`COMPLETED\t${user ? user.name : task.userId}\t${task.text}`);

			data.tasks = data.tasks.filter(t => t.id !== req.params.id);
			this.writeData(data);
			this.sendState();
			res.json({ ok: true });
		});

		// Delete a task without logging it as completed (e.g. mistaken entry)
		app.delete("/api/tasks/:id", (req, res) => {
			const data = this.readData();
			data.tasks = data.tasks.filter(t => t.id !== req.params.id);
			this.writeData(data);
			this.sendState();
			res.json({ ok: true });
		});

		this.adminServer = app.listen(port, () => {
			console.log(`[MMM-TaskList] Admin portal listening on port ${port}`);
		});
	},

	stop: function () {
		if (this.adminServer) {
			this.adminServer.close();
		}
	}
});
