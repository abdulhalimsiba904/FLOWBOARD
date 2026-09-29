# State and persistence boundaries

## Current data flow

- `useProjects` loads the versioned project snapshot once from `projectStorage`. It owns the in-memory project list and active project ID. Project create, edit, favorite, and delete actions build a new snapshot, write it through the service, then update hook state. Routes select the active project; the active ID is kept valid when the selected project is deleted.
- `useTasks(projects)` loads the task snapshot once from `taskStorage`, validating tasks against currently available projects. It owns task records separately from project metadata. Explicit create, edit, checklist, move, delete, and project-removal actions validate ownership and configured statuses, persist a full task snapshot through the service, then update the in-memory task list.
- `App` connects hook actions to routes, dialogs, toasts, project deletion, and global search navigation. It owns the transient active project view, theme, and command-palette/help visibility. Typed command definitions in `App` call the same route and UI callbacks used elsewhere; they do not duplicate project/task state or persistence. Project task creation and filter-reset commands travel as one-time route state and are consumed by `ProjectTaskWorkspace`. Project routes pass task data and callbacks to the workspace. The workspace derives project-scoped and filtered tasks; the board and grouped list derive their columns, counts, and ordering from the project and task props. Search results and list sorting are derived by `taskSelectors`; due-date categories are derived by `taskDates`. Task details derive checklist progress directly from checklist items.
- The command palette and shortcut reference live under `features/commands`. `App` handles Ctrl/Cmd+K, Ctrl/Cmd+Alt+N, and `/` at the application boundary, suppressing them in editable fields and open dialogs. The palette executes typed commands, while Settings and the palette both open the same shortcut reference. Board/List choice remains presentation state and is not persisted with project or task records.
- `Project` and `Task` types describe domain records. `taskValidation` normalizes persisted task records. `projectStorage`, `taskStorage`, and `themePreference` contain browser storage access; components and hooks do not access `localStorage` directly.
- Theme preference is read from its small service for initial UI state and written by `App` when the selected preference changes. Theme preference is separate from project and task data.

## Consistency rules

- Keep the project and task hooks as the in-memory owners for their respective domains. The app has no second project/task store; routes, dialogs, and board views receive values and mutation callbacks.
- Task mutations remain project-scoped. Removing a project also removes its tasks from the in-memory task list and writes the task snapshot immediately, instead of waiting for a later task edit or reload to discard orphan records.
- Each project/status task group uses sequential zero-based positions. Create, status change, move, and delete normalize affected groups through the task hook; derived board columns and counts are not stored.
- Project filters and global search only derive visible task sets. List sorting changes presentation order only; it does not alter persisted task positions. Drag reordering is disabled when board filters hide tasks, while the status selector appends against the complete project task set.
- Storage services use synchronous, versioned `localStorage` snapshots. If storage cannot be written, the mutation remains available in memory for the current session and the caller receives the service's persistence result. There is no cross-tab synchronization or asynchronous write queue in this local-only V1 implementation.

## State review

No Zustand store is needed for the current synchronous, single-workspace flows. The concrete ordering and project-removal consistency gaps are handled in `useTasks`; the view components continue to derive their presentations from hook state.
