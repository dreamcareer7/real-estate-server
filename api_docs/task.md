# Group Tasks

## Overview
A _Task_ is an object, assigned to a user to do some job and has a certain due date. Tasks can have _Reminders_ set on them.

### Data model

| Field         | Type         | Required? | Notes                            |
|---------------|--------------|:---------:|----------------------------------|
| `title`       | String       | ✓         |                                  |
| `description` | String       | ✓         |                                  |
| `due_date`    | Timestamp    | ✓         |                                  |
| `assignee`    | User UUID    |           | Unused. Set to the creator user. |
| `contact`     | Contact UUID |           | A related contact                |
| `deal`        | Deal UUID    |           | A related deal                   |
| `listing`     | Listing UUID |           | A related listing                |
| `status`      | String Enum  | ✓         | Pending, Done, ...               |
| `type`        | String Enum  | ✓         | Call, Message, To Do, ...        |
| `reminders`   | Reminder[]   |           |                                  |

### Get tasks [GET /crm/tasks]
<!-- include(tests/task/getForUser.md) -->

### Filter tasks [GET /crm/tasks]
<!-- include(tests/task/filterByContact.md) -->

### Create a new task [POST /crm/tasks]
<!-- include(tests/task/create.md) -->

### Deleting a task [DELETE /crm/tasks/:id]
<!-- include(tests/task/remove.md) -->

### Update a task [PUT /crm/tasks/:id]
<!-- include(tests/task/update.md) -->
