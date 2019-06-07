# Google Profile

## Overview
Each user in Rechat could have Google account. With this API section they can send access-request, verify-grant, revoke-access and get their Google account's profile data.

### Showing_Credential
A _google_credential_ is a simple and small object that contains:

Field                   | Type          | association        | Description
------------------------|:-------------:|--------------------|------------------------------------------------------------------------
id                          | uuid          |                    | Internal identifier of the contact
user                        | User          |                    | User who is the owner
brand                       | Brand         |                    | The team this object belongs to
email                       | string        |                    | gmail or g-suite email address
messages_total              | number        |                    |
threads_total               | number        |                    |
history_id                  | number        |                    |
last_profile_sync_at        | date          |                    |
last_contacts_sync_at       | date          |                    |
last_contact_groups_sync_at | date          |                    |
last_messages_sync_at       | date          |                    | 
revoked                     | Boolean       |                    | It means user credential is valid or not
created_at                  | number        |                    |
updated_at                  | number        |                    |
deleted_at                  | number        |                    |


### Request to add google account [POST /users/self/google]
<!-- include(tests/google/requestGmailAccess.md) -->