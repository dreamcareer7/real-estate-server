function issueNotification(req, res) {
  var notification = req.body;
  var user = req.user.id;

  Notification.create(notification, function(err, notification) {
    if(err)
      return res.error(err);

    res.model(notification);
  });
}

function getNotifications(req, res) {
  var user = req.user.id;

  Notification.getForUser(user, function(err, notifications) {
    if(err)
      return res.error(err);

    res.collection(notifications);
  });
}



function acknowledgeNotification(req, res) {
  var user_id = req.user.id;
  var notification_id = req.params.id;

  Notification.ack(user_id, notification_id, function(err, ok) {
    if(err)
      return res.error(err);

    res.status(204);
    res.end();
  });
}

function registerForPush(req, res) {
  var user_id = req.user.id;
  var token = req.body.device_token;

  Notification.registerForPush(user_id, token, function(err, user) {
    if(err)
      return res.error(err);

    res.model(user);
  });
}

function unregisterForPush(req, res) {
  var user_id = req.user.id;
  var token = req.params.token;

  Notification.unregisterForPush(user_id, token, function(err, user) {
    if(err)
      return res.error(err);

    res.model(user);
  });
}

function patchNotificationSettings(req, res) {
  var user_id = req.user.id;
  var room_id = req.params.id;
  var enable = req.body.enable_push || false;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    Room.get(room_id, function(err, room) {
      if(err)
        return res.error(err);

      Notification.togglePushSettings(user_id, room_id, enable, function(err, ok) {
        if(err)
          return res.error(err);

        res.status(200);
        res.end();
      });
    });
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  // app.post('/rooms/:id/users/:id/notifications', b(issueNotification));
  app.get('/notifications', b(getNotifications));
  app.post('/notifications/tokens', b(registerForPush));
  app.delete('/notifications/tokens/:id', b(unregisterForPush));
  app.patch('/room/:id/notifications', b(patchNotificationSettings));
  app.delete('/notifications/:id', b(acknowledgeNotification));
}

module.exports = router;