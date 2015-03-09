function createAlert(req, res) {
  var shortlist = req.params.sid;
  var alert = req.body;

  Alert.create(shortlist, alert, function(err, alert) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.model(alert);
  });
}

function patchAlert(req, res) {
  var shortlist = req.params.sid;
  var alert_id = req.params.aid;
  var alert = req.body;

  Alert.patch(shortlist, alert_id, alert, function(err, alert) {
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

  Alert.getOnShortlist(shortlist, function(err, alerts) {
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

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/alerts', createAlert);
  app.patch('/shortlists/:sid/alerts/:aid', patchAlert);
  app.get('/shortlists/:sid/alerts', getAlerts);
  app.delete('/shortlists/:sid/alerts/:aid', deleteAlert);
}

module.exports = router;