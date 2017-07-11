# Group Contacts

## Overview
Notifications are a way to communicate important events that are happening inside Rechat with users such as
price and status changes, new listings, open houses, etc. A notification tab similar to Facebook is presented
to users so that they can be on top of everything.

### Get all user notifications [GET /notifications]
<!-- include(tests/notification/getUsersNotification.md) -->

### Register a device token to receive a notification [POST /notification/tokens]
<!-- include(tests/notification/pushNotification.md) -->

### Cancel receiving push notifications [DELETE /notifications/tokens/:id]
<!-- include(tests/notification/cancelPushNotification.md) -->

### Get a specific notification [GET /notifications/:id]
<!-- include(tests/notification/getNotification.md) -->

### Acknowledge all personal notifications and reset the badge count [DELETE /notifications]
<!-- include(tests/notification/acknowledgeNotification.md) -->
