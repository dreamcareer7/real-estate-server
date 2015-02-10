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

// function getAlert(req, res) {
//   var message_room = req.params.id
//   var from = req.body.from || 0
//   var limit = req.body.limit || 20
//   if (limit > 200)
//     limit = 200;
//   var offset = parseInt(req.body.offset) || 0

//   Message.retrieve(message_room, from, limit, offset, function(err, messages) {
//     if(err) {
//       res.status(401);
//       res.error(err);
//       return;
//     }

//     res.collection(messages, offset, (messages[0]) ? messages[0].full_count : 0);
//   });
// }

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/users/:id/recs/alerts', createAlert);
  // app.get('/shortlists/:sid/users/:id/recs/alerts', getAlerts);
}

module.exports = router;