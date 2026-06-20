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

		const list = document.createElement("div");
		list.className = "mmm-tasklist-list";

		this.users.forEach((user) => {
			const userTasks = this.tasks.filter(t => t.userId === user.id);
			if (userTasks.length === 0) {
				return;
			}

			userTasks.forEach((task) => {
				const row = document.createElement("div");
				row.className = "mmm-tasklist-row";
				if (this.pendingCompletions[task.id]) {
					row.classList.add("completing");
				}

				const nameEl = document.createElement("span");
				nameEl.className = "tasklist-name";
				nameEl.textContent = user.name;
				row.appendChild(nameEl);

				const dashEl = document.createElement("span");
				dashEl.className = "tasklist-dash";
				dashEl.textContent = "—";
				row.appendChild(dashEl);

				const taskEl = document.createElement("span");
				taskEl.className = "tasklist-task";
				taskEl.textContent = task.text;
				taskEl.addEventListener("click", () => {
					if (this.pendingCompletions[task.id]) {
						clearTimeout(this.pendingCompletions[task.id]);
						delete this.pendingCompletions[task.id];
						row.classList.remove("completing");
					} else {
						row.classList.add("completing");
						this.pendingCompletions[task.id] = setTimeout(() => {
							delete this.pendingCompletions[task.id];
							this.sendSocketNotification("TASKLIST_COMPLETE_TASK", { taskId: task.id });
						}, 60000);
					}
				});
				row.appendChild(taskEl);

				list.appendChild(row);
			});
		});

		wrapper.appendChild(list);
		return wrapper;
	}
});
