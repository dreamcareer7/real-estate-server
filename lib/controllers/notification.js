function issueNotification(req, res) {
  var notification = req.body;
  var user = req.params.id;
  var shortlist = req.params.sid;

  notification.referred_user = user;
  notification.referred_shortlist = shortlist;

  Notification.create(notification, function(err, notification) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(200);
    res.model(notification);
  });
}

function getNotifications(req, res) {
  var user = req.params.id;
  var read = (req.query.read === 'true');

  Notification.getForUser(user, read, function(err, notifications) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(notifications);
  });
}

function getShortlistNotifications(req, res) {
  var user = req.params.id;
  var shortlist = req.params.sid;
  var read = (req.query.read === 'true');

  Notification.getForUserOnShortlist(user, shortlist, read, function(err, notifications) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(notifications);
  });
}

function getMessageRoomNotifications(req, res) {
  var user = req.params.id;
  var shortlist = req.params.sid;
  var message_room = req.params.mid;
  var read = (req.query.read === 'true');

  Notification.getForUserOnShortlistOnMessageRoom(user, shortlist, message_room, read, function(err, notifications) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(notifications);
  });
}

function getAllMessageRoomNotifications(req, res) {
  var user = req.params.id;
  var shortlist = req.params.sid;
  var read = (req.query.read === 'true');

  Notification.getForUserOnShortlistOnAllMessageRooms(user, shortlist, read, function(err, notifications) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(notifications);
  });
}

function patchNotification(req, res) {
  var user = req.params.id;
  var notification = req.params.nid;
  var read = req.body.read;

  Notification.patch(notification, read, function(err, notification) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.model(notification);
  });
}

function deleteNotification(req, res) {
  var user = req.params.id;
  var notification = req.params.nid;

  Notification.delete(notification, function(err, ok) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(200);
    res.end();
  });
}

function registerForPush(req, res) {
  var user_id = req.params.id;
  var token = req.body.device_token;

  Notification.registerForPush(user_id, token, function(err, user) {
    if(err)
      return res.error(err);

    res.model(user);
  });
}

function unregisterForPush(req, res) {
  var user_id = req.params.id;
  var token = req.params.token;

  Notification.unregisterForPush(user_id, token, function(err, user) {
    if(err)
      return res.error(err);

    res.model(user);
  });
}

function patchNotificationSettings(req, res) {
  var user_id = req.params.id;
  var shortlist_id = req.params.sid;
  var enable = req.body.enable_push;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    Shortlist.get(shortlist_id, function(err, shortlist) {
      if(err)
        return res.error(err);

      Notification.togglePushSettings(user_id, shortlist_id, enable, function(err, ok) {
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

  app.post('/shortlists/:sid/users/:id/notifications', b(issueNotification));
  app.get('/users/:id/notifications', b(getNotifications));
  app.get('/shortlists/:sid/users/:id/notifications', b(getShortlistNotifications));
  app.get('/shortlists/:sid/users/:id/message_rooms/:mid/notifications', b(getMessageRoomNotifications));
  app.get('/shortlists/:sid/users/:id/message_rooms/notifications', b(getAllMessageRoomNotifications));
  app.post('/users/:id/notifications/tokens', b(registerForPush));
  app.delete('/users/:id/notifications/tokens/:token', b(unregisterForPush));
  app.patch('/users/:id/notifications/:nid', b(patchNotification));
  app.patch('/shortlists/:sid/users/:id/notifications', b(patchNotificationSettings));
  app.delete('/users/:id/notifications/:nid', b(deleteNotification));
}

module.exports = router;