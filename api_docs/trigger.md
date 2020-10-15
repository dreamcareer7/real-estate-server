# Group Triggers

## Endpoints

### Create a user-defined trigger [POST /triggers]
<!-- include(tests/trigger/create.md) -->

### Update a trigger [PUT /triggers/:id]
<!-- include(tests/trigger/update.md) -->

### Get all triggers on a contact [GET /contacts/:id?associations[]=contact.triggers]
<!-- include(tests/trigger/checkTriggersOnContact.md) -->

### Delete a user-defined trigger [DELETE /triggers/:id]
<!-- include(tests/trigger/deleteTrigger.md) -->
