# Group Authorize

## Overview
We currently allow applications to authenticate with OAuth 2 protocol.
OAuth2 has different strategies and Rechat supports two of them:

Strategy              | Use case
--------------------- | ---------
Bearer (AccessToken)  | User login required
ClientPassword        | User login makes no sense in the context (eg Registration, where user has no credentials to begin with)

::: warning
You should use a third party library for handling the whole process.

If you are writing code to handle these steps, you are most probably doing it wrong.
:::

## Authentication [/oauth2/token]

## Get Token [POST]
Basically, login in rechat (and other oauth2 based API's) means fetching `access_token` from the server
and providing it in the HTTP headers for the remainder of the session like this:

```http
  Authorization: Bearer <fetched_access_token>
```

Additional to `access_token`, this endpoint will give you profile of the logged in user.
<!-- include(tests/authorize/token.md) -->