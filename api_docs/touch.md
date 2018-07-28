# Group Activities

## Overview
A _Touch_ is a log of some touch, e.g. a call or a message, that a user has done regarding some entitiy usually a contact.

### Data model

#### Touch

| Field         | Type          | Required? | Notes                            |
|---------------|---------------|:---------:|----------------------------------|
| description   | String        |           |                                  |
| timestamp     | Timestamp     | ✓         | Should be UTC timestamp in ms.   |
| associations  | Association[] |           | A related listing                |
| activity_type | String Enum   | ✓         |                                  |
| files         | File[]        |           |                                  |
| type          | String        |           | `touch`                   |

#### Association

Depending on the `association_type` value, one of `deal`, `contact` or `listing` is also required.

| Field            | Type        | Required? | Notes                            |
|------------------|-------------|:---------:|----------------------------------|
| crm_task         | UUID        |           | Parent Task Id                   |
| touch            | UUID        |           | Parent Touch Id               |
| listing          | UUID        |           | Associated listing id            |
| contact          | UUID        |           | Associated contact id            |
| deal             | UUID        |           | Associated deal id               |
| association_type | String Enum | ✓         | `deal` or `contact` or `listing` |
| type             | String      |           | `crm_association`                |

### Get activities [GET /crm/touches]
<!-- include(tests/touch/getForUser.md) -->

### Get an touch by id [GET /crm/touches/:id]
<!-- include(tests/touch/getSingleTouch.md) -->

### Filter activities [GET /crm/touches/search]
<!-- include(tests/touch/filterByContact.md) -->

### Create a new touch [POST /crm/touches]
<!-- include(tests/touch/create.md) -->

### Update an touch [PUT /crm/touches/:id]
<!-- include(tests/touch/updateTouch.md) -->

### Get all associated records [GET /crm/touches/:id/associations]

<!-- include(tests/touch/fetchAssociations.md) -->

### Add an associated record [POST /crm/touches/:id/associations]
<!-- include(tests/touch/addContactAssociation.md) -->

### Bulk add associated records [POST /crm/touches/:id/associations/bulk]
<!-- include(tests/touch/addBulkContactAssociations.md) -->

### Remove an association [DELETE /crm/touches/:id/associations/:id]
<!-- include(tests/touch/removeContactAssociation.md) -->

### Bulk remove associations [DELETE /crm/touches/:id/associations]
<!-- include(tests/touch/bulkRemoveAssociations.md) -->

### Deleting an touch [DELETE /crm/touches/:id]
<!-- include(tests/touch/remove.md) -->
