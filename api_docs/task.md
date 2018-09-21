# Group Tasks

## Overview
A _Task_ is an object, assigned to a user to do some job and has a certain due date. Tasks can have _Reminders_ set on them.

### Data model

#### Task

Default value for `status` is `PENDING`

| Field        | Type          | Required? | Notes                            |
|--------------|---------------|:---------:|----------------------------------|
| created_by   | User          |           | User who created the task        |
| title        | String        | ✓         |                                  |
| description  | String        |           |                                  |
| due_date     | Timestamp     | ✓         | Should be UTC timestamp in ms.   |
| assignees    | User[]        |           | Users assigned to the task.      |
| associations | Association[] |           | A related listing                |
| status       | String Enum   |           | `PENDING`, `DONE`                |
| task_type    | String Enum   | ✓         | `Call`, `Message`, `Todo`        |
| reminders    | Reminder[]    |           |                                  |
| type         | String        |           | `crm_task`                       |

Task's available model associations are as follows:

*  `crm_task.assignees`
*  `crm_task.associations`
*  `crm_task.created_by`
*  `crm_task.updated_by`
*  `crm_task.files`
*  `crm_task.reminders`

#### Reminder

| Field       | Type      | Required? | Notes                                               |
|-------------|-----------|:---------:|-----------------------------------------------------|
| timestamp   | timestamp | ✓         | Fixed timestamp for the reminder                    |
| is_relative | boolean   | ✓         | Whether the reminder is relative to task's due date |
| type        | string    |           | `reminder`                                          |

#### Association

Depending on the `association_type` value, one of `deal`, `contact` or `listing` is also required.

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

### Get a task by id [GET /crm/tasks/:id]
<!-- include(tests/task/getSingleTask.md) -->

### Filter tasks [GET /crm/tasks/search]
<!-- include(tests/task/filterByContact.md) -->

### Create a new task [POST /crm/tasks]
<!-- include(tests/task/create.md) -->

### Create a new task with relative reminder [POST /crm/tasks]

Reminders can be specified when creating the task.

<!-- include(tests/task/createAnotherTaskWithRelativeReminder.md) -->

### Update a task [PUT /crm/tasks/:id]
<!-- include(tests/task/updateTask.md) -->

### Re-assign a task [PUT /crm/tasks/:id]
<!-- include(tests/task/updateAssignee.md) -->

### Update a task, add a fixed reminder [PUT /crm/tasks/:id]

All reminders should be sent when requesting an update. New ones will be added and omitted ones are deleted.

<!-- include(tests/task/addFixedReminder.md) -->

### Get all associated records [GET /crm/tasks/:id/associations]

You don't need to pass `associations` for `crm_association` model in query args.

<!-- include(tests/task/fetchAssociations.md) -->

### Add an associated record [POST /crm/tasks/:id/associations]
<!-- include(tests/task/addContactAssociation.md) -->

### Bulk add associated records [POST /crm/tasks/:id/associations/bulk]
<!-- include(tests/task/addBulkContactAssociations.md) -->

### Remove an association [DELETE /crm/tasks/:id/associations/:id]
<!-- include(tests/task/removeContactAssociation.md) -->

### Bulk remove associations [DELETE /crm/tasks/:id/associations]
<!-- include(tests/task/bulkRemoveAssociations.md) -->

### Deleting a task [DELETE /crm/tasks/:id]
<!-- include(tests/task/remove.md) -->
