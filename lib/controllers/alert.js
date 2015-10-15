function createAlert(req, res) {
  var room_id = req.params.id;
  var alert = req.body;
  alert.created_by = req.user.id;

  Alert.create(room_id, alert, function(err, alert) {
    if(err)
      return res.error(err);

    res.model(alert);
  });
}

function checkAlert(req, res) {
  var alert = req.body;
  alert.created_by = req.user.id;

  Alert.check(alert, function(err, compact_listings) {
    if(err)
      return res.error(err);

    res.collection(compact_listings);
  });
}

function patchAlert(req, res) {
  var room_id = req.params.rid;
  var user_id = req.user.id;
  var alert_id = req.params.id;
  var alert = req.body;

  Alert.patch(room_id, user_id, alert_id, alert, function(err, alert) {
    if(err)
      return res.error(err);

    res.model(alert);
  });
}

function getAlerts(req, res) {
  var room_id = req.params.id;

  Alert.getForRoom(room_id, function(err, alerts) {
    if(err)
      return res.error(err);

    res.collection(alerts);
  });
}

function deleteAlert(req, res) {
  var room_id = req.params.rid;
  var alert_id = req.params.id;

  Alert.delete(alert_id, function(err, ok) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/valerts', b(checkAlert));
  app.post('/rooms/:id/alerts', b(createAlert));
  app.put('/rooms/:rid/alerts/:id', b(patchAlert));
  app.get('/rooms/:id/alerts', b(getAlerts));
  app.delete('/rooms/:rid/alerts/:id', b(deleteAlert));
}

module.exports = router;