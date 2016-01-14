# Group Task

Tasks are simple TODO items which could optionally be linked to transactions.

## Get user's tasks [GET /tasks]
<!-- include(tests/task/getUserTasks.md) -->

## Create [POST /tasks]
Status field could be `New`, `Done`, `Later`.
`Transaction` field is fully optional.

<!-- include(tests/task/create.md) -->

## Update Task [PUT /tasks/{id}]
<!-- include(tests/task/patchTask.md) -->

## Get [GET /tasks/{id}]
<!-- include(tests/task/getTask.md) -->

## Delete [DELETE /tasks/{id}]
<!-- include(tests/task/deleteTask.md) -->

## Assign Contact [POST /tasks/{id}/contacts]
Assigns a contact to a task
<!-- include(tests/task/assign.md) -->

## Withdraw [DELETE /tasks/{rid}/contacts/{id}]
<!-- include(tests/task/withdraw.md) -->