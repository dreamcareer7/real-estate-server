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

function fetchListingsForAlert(req, res) {
  var shortlist = req.params.sid;
  var alert = req.params.aid;

  Alert.recommendListings(alert, shortlist, function(err, ok) {
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
  app.patch('/shortlists/:sid/users/:uid/alerts/:aid', b(patchAlert));
  app.get('/shortlists/:sid/alerts', b(getAlerts));
  app.delete('/shortlists/:sid/alerts/:aid', b(deleteAlert));
  app.post('/shortlists/:sid/alerts/:aid/fetch', b(fetchListingsForAlert));
}

module.exports = router;