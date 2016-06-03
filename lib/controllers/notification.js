var async = require('async');

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
  var paging = {};
  req.pagination(paging);

  Notification.getForUser(user_id, paging, function(err, notifications) {
    if(err)
      return res.error(err);

    return res.collection(notifications);
  });
}

function ackNotification(req, res) {
  var user_id = req.user.id;
  var notification_id = req.params.id;

  Notification.ack(user_id, notification_id, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function ackNotificationBulk(req, res) {
  var user_id = req.user.id;
  var notification_ids = ObjectUtil.queryStringArray(req.query.ids);

  async.map(notification_ids, (r, cb) => {
    Notification.ack(user_id, r, cb);
  }, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function ackMessage(req, res) {
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
  var device = req.body.device_id;

  Notification.registerForPush(user_id, device, token, function(err, user) {
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
  var enable = req.body.notification;

  if (enable == undefined)
    return res.error(Error.Validation('notification property is required'));

  if (enable != true && enable != false)
    return res.error(Error.Validation('notification property must be a boolean value'));

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    Room.get(room_id, function(err, room) {
      if(err)
        return res.error(err);

      Room.setPushSettings(user_id, room_id, enable, function(err, ok) {
        if(err)
          return res.error(err);

        Room.get(room_id, function(err, room) {
          if(err)
            return res.error(err);

          return res.model(room);
        });
      });
    });
  });
}

function getNotificationsCount(req, res) {
  var user_id = req.user.id;

  Notification.summary(user_id, (err, summary) => {
    if(err)
      return res.error(err);

    return res.json({
      code: 'OK',
      data: summary
    });
  });
}

function ackRoom(req, res) {
  var user_id = req.user.id;
  var room_id = req.params.id;

  if((req.query.subjects || req.query.actions || req.query.objects) &&
     !(req.query.subjects && req.query.actions && req.query.subjects)) {
    return res.error(Error.Validation('You must either supply all of the following or none: subject, action and object'));
  }
  else if(req.query.subjects && req.query.actions && req.query.subjects) {
    var type = {
      subjects: ObjectUtil.queryStringArray(req.query.subjects),
      actions: ObjectUtil.queryStringArray(req.query.actions),
      objects: ObjectUtil.queryStringArray(req.query.objects)
    };

    Notification.ackType(user_id, room_id, type, err => {
      if(err)
        return res.error(err);

      res.status(204);
      return res.end();
    });
  } else {
    Notification.ackRoom(user_id, room_id, err => {
      if(err)
        return res.error(err);

      res.status(204);
      return res.end();
    });
  }
}

function ackTasks(req, res) {
  var user_id = req.user.id;

  Notification.ackTasks(user_id,  err => {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function ackTransactions(req, res) {
  var user_id = req.user.id;

  Notification.ackTransactions(user_id,  err => {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function ackTransaction(req, res) {
  var user_id = req.user.id;
  var transaction_id = req.params.id;

  Notification.ackTransaction(transaction_id, user_id, err => {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function ackTask(req, res) {
  var user_id = req.user.id;
  var task_id = req.params.id;

  Notification.ackTask(task_id, user_id, err => {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.delete('/tasks/notifications', b(ackTasks));
  app.delete('/transactions/notifications', b(ackTransactions));
  app.delete('/transactions/:id/notifications', b(ackTransaction));
  app.delete('/tasks/:id/notifications', b(ackTask));
  app.get('/notifications/summary', b(getNotificationsCount));
  app.post('/notifications/tokens', b(registerForPush));
  app.get('/notifications', b(getNotifications));
  app.delete('/notifications', b(ackMessage));
  app.delete('/notifications', b(ackNotificationBulk));
  app.delete('/notifications/tokens/:token', b(unregisterForPush));
  app.delete('/rooms/:id/notifications', b(ackRoom));
  app.patch('/rooms/:id/notifications', b(patchNotificationSettings));
  app.get('/notifications/:id', b(getNotification));
  app.delete('/notifications/:id', b(ackNotification));
};

module.exports = router;
