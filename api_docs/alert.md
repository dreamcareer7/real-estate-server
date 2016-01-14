#Group Alert

## Overview
An alert is a search criteria defined on top of a Room.

Whenever a new listing is added to our database that matches the criteria,
that listing will be recommended to users on that chat room.

::: note
  When a `Listing`, matches an `alert`, it is `recommend`ed to a `room`
:::

### Get room's alerts [GET /rooms/{rid}/alerts]
<!-- include(tests/alert/getUserAlerts.md) -->

### Get user's alerts [GET /alerts]
<!-- include(tests/alert/getUserAlerts.md) -->

### Create [POST /rooms/{rid}/alerts]
<!-- include(tests/alert/create.md) -->

### Update Alert [PUT /rooms/{rid}/alerts/{id}]
<!-- include(tests/alert/patchAlert.md) -->

### Delete Alert [DELETE /rooms/{rid}/alerts/{id}]
<!-- include(tests/alert/deleteAlert.md) -->

### Search for listings (Valert) [POST /valerts]
<!-- include(tests/alert/virtual.md) -->

### Share Alerts [POST /alerts]
<!-- include(tests/alert/bulkAlertShare.md) -->