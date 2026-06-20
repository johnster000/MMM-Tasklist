/* MMM-TaskList / MMM-TaskList.js
 *
 * Front-end display module. Renders a per-member tab bar; the active
 * tab shows that member's open tasks. Pulls all state from node_helper.
 */

Module.register("MMM-TaskList", {

	// ---- defaults -------------------------------------------------

	defaults: {
		adminPort: 8081,
		updateFadeSpeed: 500,
		emptyMessage: "All tasks done! ✨",
		maxWidth: "400px"  // set in config.js to match your region width
	},

	// ---- lifecycle -------------------------------------------------

	start: function () {
		this.users = [];
		this.tasks = [];
		this.loaded = false;
		this.activeUserId = null;
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
		wrapper.style.width = this.config.maxWidth;

		if (!this.loaded) {
			wrapper.innerHTML = "Loading tasks...";
			wrapper.className += " dimmed light small";
			return wrapper;
		}

		// Only show users who have at least one open task
		const activeUsers = this.users.filter(u =>
			this.tasks.some(t => t.userId === u.id)
		);

		if (activeUsers.length === 0) {
			wrapper.innerHTML = this.config.emptyMessage;
			wrapper.className += " dimmed light medium";
			return wrapper;
		}

		// If the active tab no longer has tasks, fall back to the first user
		if (!activeUsers.some(u => u.id === this.activeUserId)) {
			this.activeUserId = activeUsers[0].id;
		}

		// ---- Tab bar ----
		const tabBar = document.createElement("div");
		tabBar.className = "mmm-tasklist-tabs";

		activeUsers.forEach((user) => {
			const tab = document.createElement("button");
			tab.className = "mmm-tasklist-tab";
			if (user.id === this.activeUserId) tab.classList.add("active");
			tab.textContent = user.name;
			tab.addEventListener("click", () => {
				this.activeUserId = user.id;
				this.updateDom(0);
			});
			tabBar.appendChild(tab);
		});

		// ---- Task list for the active tab ---- (rendered above the tab bar)
		// Sort: overdue first, then by due date ascending, undated last
		const activeTasks = this.tasks
			.filter(t => t.userId === this.activeUserId)
			.sort((a, b) => {
				if (!a.dueDate && !b.dueDate) return 0;
				if (!a.dueDate) return 1;
				if (!b.dueDate) return -1;
				return new Date(a.dueDate) - new Date(b.dueDate);
			});

		const taskList = document.createElement("ul");
		taskList.className = "mmm-tasklist-items";

		activeTasks.forEach((task) => {
			const item = document.createElement("li");
			item.className = "mmm-tasklist-item";
			if (this.pendingCompletions[task.id]) {
				item.classList.add("completing");
			}
			if (task.dueDate) {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const due = new Date(task.dueDate + "T00:00:00");
				const diff = Math.round((due - today) / 86400000);
				if (diff < 0) item.classList.add("overdue");
				else if (diff === 0) item.classList.add("due-today");
			}

			const taskEl = document.createElement("span");
			taskEl.className = "tasklist-task";
			taskEl.textContent = task.text;
			taskEl.addEventListener("click", () => {
				if (this.pendingCompletions[task.id]) {
					clearTimeout(this.pendingCompletions[task.id]);
					delete this.pendingCompletions[task.id];
					item.classList.remove("completing");
				} else {
					item.classList.add("completing");
					this.pendingCompletions[task.id] = setTimeout(() => {
						delete this.pendingCompletions[task.id];
						this.sendSocketNotification("TASKLIST_COMPLETE_TASK", { taskId: task.id });
					}, 60000);
				}
			});

			item.appendChild(taskEl);
			taskList.appendChild(item);
		});

		wrapper.appendChild(taskList);
		wrapper.appendChild(tabBar);
		return wrapper;
	}
});
