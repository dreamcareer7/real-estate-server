# Group Activities

## Overview
A _CrmActivity_ is a log of some activity, e.g. a call or a message, that a user has done regarding some entitiy usually a contact.

### Data model

#### CrmActivity

| Field         | Type          | Required? | Notes                            |
|---------------|---------------|:---------:|----------------------------------|
| description   | String        |           |                                  |
| timestamp     | Timestamp     | ✓         | Should be UTC timestamp in ms.   |
| associations  | Association[] |           | A related listing                |
| activity_type | String Enum   | ✓         |                                  |
| files         | File[]        |           |                                  |
| type          | String        |           | `crm_activity`                   |

#### Association

Depending on the `association_type` value, one of `deal`, `contact` or `listing` is also required.

| Field            | Type        | Required? | Notes                            |
|------------------|-------------|:---------:|----------------------------------|
| crm_task         | UUID        |           | Parent Task Id                   |
| crm_activity     | UUID        |           | Parent Activity Id               |
| listing          | UUID        |           | Associated listing id            |
| contact          | UUID        |           | Associated contact id            |
| deal             | UUID        |           | Associated deal id               |
| association_type | String Enum | ✓         | `deal` or `contact` or `listing` |
| type             | String      |           | `crm_association`                |

### Get activities [GET /crm/activities]
<!-- include(tests/crm_activity/getForUser.md) -->

### Get an activity by id [GET /crm/activities/:id]
<!-- include(tests/crm_activity/getSingleActivity.md) -->

### Filter activities [GET /crm/activities/search]
<!-- include(tests/crm_activity/filterByContact.md) -->

### Create a new activity [POST /crm/activities]
<!-- include(tests/crm_activity/create.md) -->

### Update an activity [PUT /crm/activities/:id]
<!-- include(tests/crm_activity/updateActivity.md) -->

### Get all associated records [GET /crm/activities/:id/associations]

<!-- include(tests/crm_activity/fetchAssociations.md) -->

### Add an associated record [POST /crm/activities/:id/associations]
<!-- include(tests/crm_activity/addContactAssociation.md) -->

### Bulk add associated records [POST /crm/activities/:id/associations/bulk]
<!-- include(tests/crm_activity/addBulkContactAssociations.md) -->

### Remove an association [DELETE /crm/activities/:id/associations/:id]
<!-- include(tests/crm_activity/removeContactAssociation.md) -->

### Bulk remove associations [DELETE /crm/activities/:id/associations]
<!-- include(tests/crm_activity/bulkRemoveAssociations.md) -->

### Deleting an activity [DELETE /crm/activities/:id]
<!-- include(tests/crm_activity/remove.md) -->
