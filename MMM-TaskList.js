/* MMM-TaskList / MMM-TaskList.js
 *
 * Front-end display module. Renders a table of household members
 * and their assigned tasks. Pulls all data/state from node_helper —
 * no business logic here, just rendering.
 */

Module.register("MMM-TaskList", {

	// ---- defaults -------------------------------------------------

	defaults: {
		adminPort: 8081,      // port the admin server listens on (passed to node_helper)
		updateFadeSpeed: 500, // ms for DOM fade transition on redraw
		emptyMessage: "All tasks done! \u2728"
	},

	// ---- lifecycle -------------------------------------------------

	start: function () {
		this.users = [];
		this.tasks = [];
		this.loaded = false;
		this.pendingCompletions = {}; // taskId -> timeoutId

		this.sendSocketNotification("TASKLIST_INIT", this.config);
	},

	getStyles: function () {
		return ["MMM-TaskList.css"];
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "TASKLIST_STATE") {
			this.users = payload.users || [];
			this.tasks = payload.tasks || [];
			this.loaded = true;
			this.updateDom(this.config.updateFadeSpeed);
		}
	},

	// ---- rendering -------------------------------------------------

	getDom: function () {
		const wrapper = document.createElement("div");
		wrapper.className = "mmm-tasklist-wrapper";

		if (!this.loaded) {
			wrapper.innerHTML = "Loading tasks...";
			wrapper.className += " dimmed light small";
			return wrapper;
		}

		if (this.tasks.length === 0) {
			wrapper.innerHTML = this.config.emptyMessage;
			wrapper.className += " dimmed light medium";
			return wrapper;
		}

		const table = document.createElement("table");
		table.className = "mmm-tasklist-table medium";

		// Group tasks by user, in the order users were created.
		this.users.forEach((user) => {
			const userTasks = this.tasks.filter(t => t.userId === user.id);
			if (userTasks.length === 0) {
				return; // don't show a row for a user with no open tasks
			}

			userTasks.forEach((task) => {
				const row = document.createElement("tr");
				row.className = "mmm-tasklist-row";
				if (this.pendingCompletions[task.id]) {
					row.classList.add("completing");
				}

				const nameCell = document.createElement("td");
				nameCell.className = "tasklist-name";
				nameCell.innerHTML = user.name;
				row.appendChild(nameCell);

				const dashCell = document.createElement("td");
				dashCell.className = "tasklist-dash";
				dashCell.textContent = "—";
				row.appendChild(dashCell);

				const taskCell = document.createElement("td");
				taskCell.className = "tasklist-task";
				taskCell.innerHTML = task.text;
				taskCell.addEventListener("click", () => {
					if (this.pendingCompletions[task.id]) {
						// Undo: cancel the pending completion
						clearTimeout(this.pendingCompletions[task.id]);
						delete this.pendingCompletions[task.id];
						row.classList.remove("completing");
					} else {
						// Queue completion: show strikethrough, remove after 60s
						row.classList.add("completing");
						this.pendingCompletions[task.id] = setTimeout(() => {
							delete this.pendingCompletions[task.id];
							this.sendSocketNotification("TASKLIST_COMPLETE_TASK", { taskId: task.id });
						}, 60000);
					}
				});
				row.appendChild(taskCell);

				table.appendChild(row);
			});
		});

		wrapper.appendChild(table);
		return wrapper;
	}
});
