# MMM-TaskList

A [MagicMirror²](https://magicmirror.builders/) module that displays household members and their assigned tasks on the mirror. Tasks disappear from the display once marked complete, and completions are logged to a history file.

A separate admin web portal (its own port, independent of the mirror's own server) lets you add household members and assign/complete tasks from any browser on your network.

## Features

- Displays a simple table: member name + their open tasks
- Completed tasks vanish from the mirror display immediately
- Every completion is timestamped and appended to `data/completed.log`
- Admin portal runs on its own dedicated port — manage everything from a phone or laptop
- Data persists in a plain JSON file (`data/tasks.json`) — no database required

## Screenshots

_(add a screenshot of your mirror display and the admin portal here)_

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/johnster000/MMM-Tasklist.git MMM-TaskList
cd MMM-TaskList
npm install
```

## Configuration

Add to `~/MagicMirror/config/config.js`:

```js
{
  module: "MMM-TaskList",
  position: "top_right",
  config: {
    adminPort: 8081
  }
}
```

| Option            | Type   | Default                  | Description                                      |
|--------------------|--------|---------------------------|--------------------------------------------------|
| `adminPort`         | number | `8081`                    | Port the admin web portal listens on             |
| `updateFadeSpeed`   | number | `500`                     | Fade transition speed (ms) when the table redraws |
| `emptyMessage`      | string | `"All chores done! ✨"`   | Message shown when there are no open tasks       |

## Using the admin portal

Once the mirror is running, visit:

```
http://<mirror-ip-or-hostname>:8081
```

From there you can:
- Add household members
- Assign tasks to a member
- Mark tasks complete (removes them from the mirror display, logs to history)
- Delete a task or member entirely

**Note:** the admin portal currently has no authentication. It's intended for use on a trusted home network. If you need a password gate, that can be added with simple HTTP basic auth in `node_helper.js`.

## Data files

Created automatically on first run, inside `MMM-TaskList/data/`:

- `tasks.json` — current users and open tasks (not committed to git — see `.gitignore`)
- `completed.log` — tab-separated history of completed tasks: `timestamp  member  task`

## Architecture

- `MMM-TaskList.js` — front-end module, renders the table, no business logic
- `node_helper.js` — backend: reads/writes `tasks.json`, runs the admin Express server on its own port, pushes state to the front end via socket notifications
- `admin/public/index.html` — static admin UI served by the admin Express server

## License

MIT (or update to your preference)
