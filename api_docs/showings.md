# Showings Credential

## Overview
Each agent in Rechat could have Showings.com account. With this API section they can add, view, update and delete their showings.com account's credential

### Showing_Credential
A _Showing_Credential_ is a simple and small object that contains:

Field                   | Type          | association        | Description
------------------------|:-------------:|--------------------|------------------------------------------------------------------------
id                      | uuid          |                    | Internal identifier of the contact
user                    | User          |                    | User who is the owner
brand                   | Brand         |                    | The team this object belongs to
username                | string        |                    | Agent username in showings.com (saved encrypted)
password                | string        |                    | Agent password in showings.com (saved encrypted)
last_crawled_at         | number        |                    |
created_at              | number        |                    |
updated_at              | number        |                    |
deleted_at              | number        |                    |


### Create a credential [POST /showings/credentials]
<!-- include(tests/showings/createCredential.md) -->

### Retrieve a credential [GET /showings/credentials]
<!-- include(tests/showings/getCredential.md) -->

### Update a credential [PUT /showings/credentials]
<!-- include(tests/showings/updateCredential.md) -->

### Delete a credential [DELETE /showings/credentials]
<!-- include(tests/showings/deleteCredential.md) -->