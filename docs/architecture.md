# State and persistence boundaries

## Current data flow

- `useProjects` loads the versioned project snapshot once from `projectStorage`. It owns the in-memory project list and active project ID. Project create, edit, favorite, and delete actions build a new snapshot, write it through the service, then update hook state. Routes select the active project; the active ID is kept valid when the selected project is deleted.
- `useTasks(projects)` loads the task snapshot once from `taskStorage`, validating tasks against currently available projects. It owns task records separately from project metadata. Explicit create, edit, checklist, move, delete, and project-removal actions validate ownership and configured statuses, persist a full task snapshot through the service, then update the in-memory task list.
- `App` connects hook actions to routes, dialogs, toasts, and project deletion. Project routes pass task data and callbacks to `ProjectTaskWorkspace`. The workspace derives project-scoped tasks; the board and grouped list derive their columns, counts, and ordering from the project and task props. Task details derive checklist progress directly from checklist items.
- `Project` and `Task` types describe domain records. `taskValidation` normalizes persisted task records. `projectStorage`, `taskStorage`, and `themePreference` contain browser storage access; components and hooks do not access `localStorage` directly.
- Theme preference is read from its small service for initial UI state and written by `App` when the selected preference changes. Theme preference is separate from project and task data.

## Consistency rules

- Keep the project and task hooks as the in-memory owners for their respective domains. The app has no second project/task store; routes, dialogs, and board views receive values and mutation callbacks.
- Task mutations remain project-scoped. Removing a project also removes its tasks from the in-memory task list and writes the task snapshot immediately, instead of waiting for a later task edit or reload to discard orphan records.
- Each project/status task group uses sequential zero-based positions. Create, status change, move, and delete normalize affected groups through the task hook; derived board columns and counts are not stored.
- Storage services use synchronous, versioned `localStorage` snapshots. If storage cannot be written, the mutation remains available in memory for the current session and the caller receives the service's persistence result. There is no cross-tab synchronization or asynchronous write queue in this local-only V1 implementation.

## State review

No Zustand store is needed for the current synchronous, single-workspace flows. The concrete ordering and project-removal consistency gaps are handled in `useTasks`; the view components continue to derive their presentations from hook state.
