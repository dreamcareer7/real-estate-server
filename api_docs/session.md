# Group Session

## Overview

Rechat allocates pairs of `client_id` and `client_secret` to each client application.

Also we maintain the client status on the server. Each client can have one of the following statuses:

client_version_status | meaning
--------------------- | -----------------------------------------------
`UpgradeUnavailable`  | There's no upgrade available for this client.
`UpgradeAvailable`    | There is an upgrade available for the client.   Updating is optional.
`UpgradeRequired`     | Client must refuse to function without upgrade. Updating is mandatory.


### Create a session [POST /sessions]

::: warning
  The concept of a session has been deprecated.
  Please see the section below regarding handling client updates.

  However, it will be included for a while to maintain backward compatility with
  versions of Rechat that depend on it and are still in circulation.
:::

When a user starts using the program, a new session must be started.

The new session consists of user informing us about his device and client information.
Like `Rechat iOS app 2.0 on iPhone`

In respond, we will let user know about potential upgrades to his client.

<!-- include(tests/session/create.md) -->

### Client Updates

Each `access_token` you fetch from Rechat will be associated with your `client_id`.

From then on, all the requests you make to Rechat will be compared against you client.

If the acess token was obtained using a client which is now deprecated,
server will refuse the request with a `HTTP 490`.

Therefore, `HTTP 490` means the user has to update his client.
Once he has a new client, he can obtain new access codes using the refresh code he already had.

If the client status is `UpgradeAvailable`, the server will accomply with the request.
An extra header named `X-RECHAT-CLIENT-STATUS: UpgradeAvailable` will be appended to headers.