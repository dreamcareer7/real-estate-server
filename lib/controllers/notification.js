function issueNotification(req, res) {
  var notification_id = req.body;
  var user_id = req.user.id;

  Notification.create(notification_id, function(err, notification) {
    if(err)
      return res.error(err);

    return res.model(notification);
  });
}

function getNotification(req, res) {
  var user_id = req.user.id;
  var notification_id = req.params.id;

  Notification.get(notification_id, function(err, notification) {
    if(err)
      return res.error(err);

    return res.model(notification);
  });
}

function getNotifications(req, res) {
  var user_id = req.user.id;

  Notification.getForUser(user_id, function(err, notifications) {
    if(err)
      return res.error(err);

    return res.collection(notifications);
  });
}

function acknowledgeNotification(req, res) {
  var user_id = req.user.id;
  var notification_id = req.params.id;

  Notification.ack(user_id, notification_id, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function acknowledgeMessage(req, res) {
  if (!req.query.message)
    return res.error(Error.Validation('Supply a message ID'));

  var user_id = req.user.id;
  var message_id = req.query.message;

  Notification.ackMessage(user_id, message_id, function(err, notification) {
    if(err)
      return res.error(err);

    res.status(200);
    return res.model(notification);
  });
}

function registerForPush(req, res) {
  var user_id = req.user.id;
  var token = req.body.device_token;

  Notification.registerForPush(user_id, token, function(err, user) {
    if(err)
      return res.error(err);

    return res.model(user);
  });
}

function unregisterForPush(req, res) {
  var user_id = req.user.id;
  var token = req.params.token;

  Notification.unregisterForPush(user_id, token, function(err, user) {
    if(err)
      return res.error(err);

    return res.model(user);
  });
}

function patchNotificationSettings(req, res) {
  var user_id = req.user.id;
  var room_id = req.params.id;
  var enable = (req.body.notification == undefined) ? true : req.body.notification;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    Room.get(room_id, function(err, room) {
      if(err)
        return res.error(err);

      Room.setPushSettings(user_id, room_id, enable, function(err, ok) {
        if(err)
          return res.error(err);

        res.status(204);
        return res.end();
      });
    });
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  // app.post('/rooms/:id/users/:id/notifications', b(issueNotification));
  app.get('/notifications', b(getNotifications));
  app.post('/notifications/tokens', b(registerForPush));
  app.delete('/notifications/tokens/:token', b(unregisterForPush));
  app.patch('/rooms/:id/notifications', b(patchNotificationSettings));
  app.get('/notifications/:id', b(getNotification));
  app.delete('/notifications/:id', b(acknowledgeNotification));
  app.delete('/notifications', b(acknowledgeMessage));
};

module.exports = router;
