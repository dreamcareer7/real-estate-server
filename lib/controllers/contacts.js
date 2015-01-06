function getContactsForUser(req, res) {
  var user_id = req.params.id;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = req.body.offset || 0

  Contact.getByUser(user_id, limit, offset, function(err, contacts) {
    if(err)
      return res.error(err);

    if(!contacts) {
      res.status(200);
      res.end();
      return ;
    }

    res.collection(contacts, offset, contacts[0].full_count || 0);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/users/:id/contacts', b(getContactsForUser));
}

module.exports = router;