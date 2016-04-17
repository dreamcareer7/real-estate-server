function postMessage(req, res) {
  var room_id = req.params.id;
  var message = req.body;
  message.author = req.user.id;

  Room.get(room_id, function(err, room) {
    if(err)
      return res.error(err);

    Room.getUsers(room_id, (err, users) => {
      if(err)
        return cb(err);

      console.log('>>>>', users, message.author)
      if(!Room.belongs(users, message.author))
        return res.error(Error.Forbidden('User is not a member of this room'));

      Message.post(room_id, message, true, function(err, message) {
        if(err)
          return res.error(err);

        return res.model(message);
      });
    })
  });
}

function retrieveMessages(req, res) {
  var user_id = req.user.id;
  var room_id = req.params.id;
  var paging = {};
  req.pagination(paging);
  paging.recommendation = req.query.recommendation || 'None';
  paging.reference = req.query.reference || 'None';

  console.log('1.1', (new Date()).getTime() - req.time)
  Message.retrieve(room_id, paging, function(err, messages) {
    if(err)
      return res.error(err);

    console.log('1.2', (new Date()).getTime() - req.time)
    return res.collection(messages);
  });
}

function postSeamless(req, res) {
  Message.postSeamless(req, err => {
    if(err)
      return res.error(err);

    res.status(200);
    return res.json({status: 'OK'});
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/rooms/:id/messages', b(postMessage));
  app.post('/messages', postSeamless);
  app.get('/rooms/:id/messages', b(retrieveMessages));
};

module.exports = router;
