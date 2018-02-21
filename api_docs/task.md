# Group Tasks

## Overview
A _Task_ is an object, assigned to a user to do some job and has a certain due date. Tasks can have _Reminders_ set on them.

### Data model

#### Task

| Field         | Type         | Required? | Notes                            |
|---------------|--------------|:---------:|----------------------------------|
| `title`       | String       | ✓         |                                  |
| `description` | String       | ✓         |                                  |
| `due_date`    | Timestamp    | ✓         | Should be UTC timestamp in ms.   |
| `assignee`    | User UUID    |           | Unused. Set to the creator user. |
| `contact`     | Contact UUID |           | A related contact                |
| `deal`        | Deal UUID    |           | A related deal                   |
| `listing`     | Listing UUID |           | A related listing                |
| `status`      | String Enum  | ✓         | Pending, Done, ...               |
| `task_type`   | String Enum  | ✓         | Call, Message, To Do, ...        |
| `reminders`   | Reminder[]   |           |                                  |

#### Reminder

| Field         | Type      | Required? | Notes                                                                           |
|---------------|-----------|:---------:|---------------------------------------------------------------------------------|
| `time`        | number    |           | Time offset from Task's `due_date`                                              |
| `timestamp`   | timestamp |           | Fixed timestamp for the reminder                                                |
| `is_relative` | boolean   | ✓         | If true, `timestamp` is calculated based on `time` offset and Task's `due_date` |

### Get tasks [GET /crm/tasks]
<!-- include(tests/task/getForUser.md) -->

### Filter tasks [GET /crm/tasks]
<!-- include(tests/task/filterByContact.md) -->

### Create a new task [POST /crm/tasks]
<!-- include(tests/task/create.md) -->

### Create a new task with relative reminder [POST /crm/tasks]
<!-- include(tests/task/createAnotherTaskWithRelativeReminder.md) -->

### Update a task, add a fixed reminder [PUT /crm/tasks/:id]
<!-- include(tests/task/addFixedReminder.md) -->

### Update a task [PUT /crm/tasks/:id]
<!-- include(tests/task/updateContact.md) -->

### Deleting a task [DELETE /crm/tasks/:id]
<!-- include(tests/task/remove.md) -->
