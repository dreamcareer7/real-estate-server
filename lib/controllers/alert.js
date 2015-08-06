function createAlert(req, res) {
  var shortlist_id = req.params.sid;
  var user_id = req.params.uid;

  var alert = req.body;

  Alert.create(shortlist_id, alert, function(err, alert) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.model(alert);
  });
}

function checkAlert(req, res) {
  var shortlist_id = req.params.sid;
  var user_id = req.params.uid;

  var alert = req.body;

  Alert.check(shortlist_id, alert, function(err, count) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.model(count);
  });
}

function patchAlert(req, res) {
  var shortlist_id = req.params.sid;
  var user_id = req.params.uid;
  var alert_id = req.params.aid;
  var alert = req.body;

  Alert.patch(shortlist_id, user_id, alert_id, alert, function(err, alert) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.model(alert);
  });
}

function getAlerts(req, res) {
  var message_room = req.params.mid;
  var shortlist = req.params.sid;

  Alert.getForShortlist(shortlist, function(err, alerts) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(alerts);
  });
}

function deleteAlert(req, res) {
  var shortlist = req.params.sid;
  var alert = req.params.aid;

  Alert.delete(alert, function(err, ok) {
    if(err) {
      res.status(401);
      return res.error(err);
    }

    res.status(200);
    return res.end();
  });
}

function archiveAlert(req, res) {
  var shortlist = req.params.sid;
  var alert = req.params.aid;

  Alert.archive(alert, function(err, ok) {
    if(err) {
      res.status(401);
      return res.error(err);
    }

    res.status(200);
    return res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/users/:uid/alerts', b(createAlert));
  app.post('/shortlists/:sid/users/:uid/valerts', b(checkAlert));
  app.patch('/shortlists/:sid/users/:uid/alerts/:aid', b(patchAlert));
  app.get('/shortlists/:sid/users/:uid/alerts', b(getAlerts));
  app.delete('/shortlists/:sid/users/:aid/alerts/:aid', b(archiveAlert));
}

module.exports = router;