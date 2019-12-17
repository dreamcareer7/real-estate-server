# Google Profile

## Overview
Each user in Rechat could have Google account. With this API section they can send access-request, verify-grant, revoke-access and get their Google account's profile data.

### Google Credential
A _google_credential_ is a simple and small object that contains:

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



### Request to add google account [POST /users/self/google]
- Valid scopes: ['contacts.readonly', 'gmail.readonly', 'gmail.send']
<!-- include(tests/google/requestGmailAccess.md) -->

### Request to get an specific google credential [GET /users/self/google/:id]
<!-- include(tests/google/getGoogleProfile.md) -->

### Request to get user's all google credentials  [GET /users/self/google]
<!-- include(tests/google/getGoogleProfiles.md) -->

### Request to sync a google credential  [POST /users/self/google/:id/sync]
<!-- include(tests/google/forceSync.md) -->

### Request to delete a google credential  [DELETE /users/self/google/:id]
<!-- include(tests/google/deleteAccount.md) -->