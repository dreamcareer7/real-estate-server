# Group Notification

## Get notifications [GET /notifications]
<!-- include(tests/notification/getUsersNotification.md) -->

## Get notification [GET /notification/{id}]
<!-- include(tests/notification/getNotification.md) -->

## Acknowledge notification [DELETE /notifications/{id}]
<!-- include(tests/notification/acknowledgeNotification.md) -->

## Register device token [POST /notifications/tokens]
<!-- include(tests/notification/pushNotification.md) -->

## Unregister device token [DELETE /notifications/tokens/{id}]
<!-- include(tests/notification/cancelPushNotification.md) -->

## Set notification settings [PATCH /rooms/{id}/notifications]
<!-- include(tests/notification/patchNotificationSettings.md) -->