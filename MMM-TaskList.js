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

		// Tell node_helper our config (so it knows which port to use)
		// and ask it to start the admin server + send us current state.
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
			wrapper.className += " dimmed light small";
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

			userTasks.forEach((task, index) => {
				const row = document.createElement("tr");
				row.className = "mmm-tasklist-row";

				const nameCell = document.createElement("td");
				nameCell.className = "tasklist-name";
				if (index === 0) {
					nameCell.innerHTML = user.name;
				}
				row.appendChild(nameCell);

				const taskCell = document.createElement("td");
				taskCell.className = "tasklist-task";
				taskCell.innerHTML = task.text;
				taskCell.addEventListener("click", () => {
					row.classList.add("completing");
					this.sendSocketNotification("TASKLIST_COMPLETE_TASK", { taskId: task.id });
				});
				row.appendChild(taskCell);

				table.appendChild(row);
			});
		});

		wrapper.appendChild(table);
		return wrapper;
	}
});
