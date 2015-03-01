function issueNotification(req, res) {
  var notification = req.body;
  var user = req.params.id;
  var shortlist = req.params.sid;

  notification.referring_user = user;
  notification.referring_shortlist = shortlist;

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

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/users/:id/notifications', issueNotification);
  app.get('/users/:id/notifications', getNotifications);
  app.delete('/users/:id/notifications/:nid', deleteNotification);
}

module.exports = router;