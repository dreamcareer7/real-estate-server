# Group Session

## Overview

When a user starts using the program, a new session must be started.

The new session consists of user informing us about his device and client information.
Like `Rechat iOS app 2.0 on iPhone`


### Create a session [POST /sessions]

In respond, we will let user know about potential upgrades to his client.

client_version_status | meaning
--------------------- | -----------------------------------------------
`UpgradeUnavailable`  | There's no upgrade available for this client.
`UpgradeAvailable`    | There is an upgrade available for the client.
`UpgradeRequired`     | Client must refuse to function without upgrade.

<!-- include(tests/session/create.md) -->