# MMM-TaskList

A [MagicMirror²](https://magicmirror.builders/) module that displays household members and their assigned tasks on the mirror. Members are shown as tabs — tap a tab to view that person's tasks. Tap a task to mark it complete; it stays crossed out for 60 seconds (giving you time to undo) before it is removed from the display and logged.

A separate admin web portal (its own port, independent of the mirror's own server) lets you manage members and tasks from any phone or laptop on your network, and includes a history view with per-person completion stats.

## Features

- Per-member tab bar — only members with open tasks appear
- Tap a task on the mirror to mark it complete; tap again within 60 seconds to undo
- Every completion is timestamped and appended to `data/completed.log`
- Admin portal with a Tasks tab and a History tab (all-time stats, per-person bar chart, grouped activity log)
- Admin portal is mobile-friendly — works well from a phone
- Data persists in a plain JSON file (`data/tasks.json`) — no database required

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
  position: "bottom_right",
  config: {
    adminPort: 8081,
    maxWidth: "350px"
  }
}
```

| Option            | Type   | Default               | Description                                                         |
|--------------------|--------|-----------------------|---------------------------------------------------------------------|
| `adminPort`        | number | `8081`                | Port the admin web portal listens on                                |
| `maxWidth`         | string | `"400px"`             | Width of the module — set this to prevent overflow into adjacent modules |
| `updateFadeSpeed`  | number | `500`                 | Fade transition speed (ms) when the display redraws                 |
| `emptyMessage`     | string | `"All tasks done! ✨"` | Message shown on the mirror when there are no open tasks            |

## Using the admin portal

Once the mirror is running, open a browser on any device on your network and visit:

```
http://<mirror-ip-or-hostname>:8081
```

From there you can:
- Add or remove household members
- Assign tasks to a member
- Mark tasks complete (logged to history) or delete them without logging
- View the History tab for completion stats and a full activity log

**Note:** the admin portal has no authentication and is intended for use on a trusted home network.

## Data files

Created automatically on first run inside `MMM-TaskList/data/`:

- `tasks.json` — current members and their open tasks (excluded from git)
- `completed.log` — tab-separated completion history: `timestamp  COMPLETED  member  task`

## Architecture

- `MMM-TaskList.js` — front-end module; renders the tab bar and task list, handles touch-to-complete logic
- `node_helper.js` — backend; reads/writes `tasks.json`, appends to `completed.log`, runs the admin Express server on its own port, pushes state to the front end via socket notifications
- `admin/public/index.html` — self-contained admin UI served by the Express server

## License

MIT
