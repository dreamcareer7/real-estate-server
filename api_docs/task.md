# Group Tasks

## Overview
A _Task_ is an object, assigned to a user to do some job and has a certain due date. Tasks can have _Reminders_ set on them.

### Data model

#### Task

| Field        | Type          | Required? | Notes                            |
|--------------|---------------|:---------:|----------------------------------|
| title        | String        | ✓         |                                  |
| description  | String        | ✓         |                                  |
| due_date     | Timestamp     | ✓         | Should be UTC timestamp in ms.   |
| assignee     | User UUID     |           | Unused. Set to the creator user. |
| associations | Association[] |           | A related listing                |
| status       | String Enum   | ✓         | `PENDING`, `DONE`                |
| task_type    | String Enum   | ✓         | `Call`, `Message`, `Todo`        |
| reminders    | Reminder[]    |           |                                  |
| type         | String        |           | `crm_task`                       |

#### Reminder

| Field       | Type      | Required? | Notes                                                                           |
|-------------|-----------|:---------:|---------------------------------------------------------------------------------|
| time        | number    |           | Time offset from Task's `due_date`                                              |
| timestamp   | timestamp |           | Fixed timestamp for the reminder                                                |
| is_relative | boolean   | ✓         | If true, `timestamp` is calculated based on `time` offset and Task's `due_date` |
| type        | string    |           | `reminder`                                                                      |

#### Association

| Field            | Type        | Required? | Notes                            |
|------------------|-------------|:---------:|----------------------------------|
| crm_task         | UUID        |           | Parent Task Id                   |
| listing          | UUID        |           | Associated listing id            |
| contact          | UUID        |           | Associated contact id            |
| deal             | UUID        |           | Associated deal id               |
| association_type | String Enum | ✓         | `deal` or `contact` or `listing` |
| type             | String      |           | `crm_association`                |

### Get tasks [GET /crm/tasks]
<!-- include(tests/task/getForUser.md) -->

### Filter tasks [GET /crm/tasks]
<!-- include(tests/task/filterByContact.md) -->

### Create a new task [POST /crm/tasks]
<!-- include(tests/task/create.md) -->

### Create a new task with relative reminder [POST /crm/tasks]

Reminders can be specified when creating the task.

<!-- include(tests/task/createAnotherTaskWithRelativeReminder.md) -->

### Update a task [PUT /crm/tasks/:id]
<!-- include(tests/task/updateTask.md) -->

### Update a task, add a fixed reminder [PUT /crm/tasks/:id]

All reminders should be sent when requesting an update. New ones will be added and omitted ones are deleted.

<!-- include(tests/task/addFixedReminder.md) -->

### Add an associated record [POST /crm/tasks/:id/associations]
<!-- include(tests/task/addContactAssociation.md) -->

### Remove an association [DELETE /crm/tasks/:id/associations/:association]
<!-- include(tests/task/removeContactAssociation.md) -->

### Deleting a task [DELETE /crm/tasks/:id]
<!-- include(tests/task/remove.md) -->
