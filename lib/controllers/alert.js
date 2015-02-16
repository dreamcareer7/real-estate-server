function createAlert(req, res) {
  var user = req.params.id;
  var shortlist = req.params.sid;
  var alert = req.body;

  Alert.create(user, shortlist, alert, function(err, alert) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(200);
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

    res.collection(alerts, 0, (alerts[0]) ? alerts[0].full_count : 0);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/alerts', createAlert);
  app.get('/shortlists/:sid/alerts', getAlerts);
}

module.exports = router;