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

  Notification.getForUser(user, function(err, notifications) {
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
  var read = Boolean(req.body.read);

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
  var token = req.body.device_token;

  Notification.unregisterForPush(user_id, token, function(err, user) {
    if(err)
      return res.error(err);

    res.model(user);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/users/:id/notifications', issueNotification);
  app.get('/users/:id/notifications', getNotifications);
  app.post('/users/:id/notifications/register', registerForPush);
  app.delete('/users/:id/notifications/register', unregisterForPush);
  app.patch('/users/:id/notifications/:nid', patchNotification);
  app.delete('/users/:id/notifications/:nid', deleteNotification);
}

module.exports = router;