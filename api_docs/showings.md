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
selected_location       | string        |                    | Sample: 6,1,DFW
selected_location_string| string        |                    | Sample: Dallas/Fort Worth
last_crawled_at         | number        |                    |
login_status            | Boolean       |                    | It means user credential is valid or not
created_at              | number        |                    |
updated_at              | number        |                    |
deleted_at              | number        |                    |


### Create a credential [POST /users/self/showings/credentials]
<!-- include(tests/showings/createCredential.md) -->

### Retrieve a credential [GET /users/self/showings/credentials]
<!-- include(tests/showings/getCredential.md) -->

### Update a credential [PUT /users/self/showings/credentials]
<!-- include(tests/showings/updateCredential.md) -->

### Update a credential's market [PUT /users/self/showings/credentials/market]
<!-- include(tests/showings/updateMarket.md) -->

### Delete a credential [DELETE /users/self/showings/credentials]
<!-- include(tests/showings/deleteCredential.md) -->