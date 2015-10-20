function getContacts(req, res) {
  var user_id = req.user.id;
  var paging = {};
  req.pagination(paging);

  Contact.getForUser(user_id, paging, function(err, contacts) {
    if(err)
      return res.error(err);

    res.collection(contacts);
  });
}

function addContact(req, res) {
  var user_id = req.user.id;
  var contact = req.body;

  Contact.add(user_id, contact, function(err, contact) {
    if(err)
      return res.error(err);

    res.model(contact)
  });
}

function deleteContact(req, res) {
  var user_id = req.user.id;
  var contact_id = req.params.id;

  Contact.delete(contact_id, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    res.end();
  });
}

function updateContact(req, res) {
  var contact_id = req.params.id;
  var contact = req.body;

  Contact.update(contact_id, contact, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/contacts', b(getContacts));
  app.post('/contacts', b(addContact));
  app.put('/contacts/:id', b(updateContact));
  app.delete('/contacts/:id', b(deleteContact));
}

module.exports = router;