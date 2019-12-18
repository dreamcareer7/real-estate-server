# Microsoft Profile

## Overview
Each user in Rechat could have Microsoft account. With this API section they can send access-request, verify-grant, revoke-access and get their Microsoft account's profile data.

### Microsoft Credential
A _microsoft_credential_ is a simple and small object that contains:

|          Column          |           Type           | Nullable |
| ------------------------ | ------------------------ | -------- |
| id                       | uuid                     | not null |
| user                     | uuid                     | not null |
| brand                    | uuid                     | not null |
| email                    | text                     | not null |
| resource_name            | text                     | not null |
| display_name             | text                     | not null |
| first_name               | text                     |          |
| last_name                | text                     |          |
| photo                    | text                     |          |
| scope                    | jsonb                    |          |
| scope_summary            | jsonb                    |          |
| revoked                  | boolean                  | not null |
| sync_status              | text                     |          |
| last_sync_at             | timestamp with time zone |          |
| last_sync_duration       | integer                  |          |
| created_at               | timestamp with time zone | not null |
| updated_at               | timestamp with time zone | not null |
| deleted_at               | timestamp with time zone |          |



### Request to add microsoft account [POST /users/self/microsoft]
- Valid scopes: ['Contacts.Read', 'Mail.Read', 'Mail.Send']
- To redirect back user to an specific address, use `redirect` key to set your custom address.
<!-- include(tests/microsoft/requestOutlookAccess.md) -->

### Request to get an specific microsoft credential [GET /users/self/microsoft/:id]
<!-- include(tests/microsoft/getMicrosoftProfile.md) -->

### Request to get user's all microsoft credentials  [GET /users/self/microsoft]
<!-- include(tests/microsoft/getMicrosoftProfiles.md) -->

### Request to sync a microsoft credential  [POST /users/self/microsoft/:id/sync]
<!-- include(tests/microsoft/forceSync.md) -->

### Request to delete a microsoft credential  [DELETE /users/self/microsoft/:id]
<!-- include(tests/microsoft/deleteAccount.md) -->