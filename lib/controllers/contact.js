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

    res.collection(contacts, offset, (contacts[0]) ? contacts[0].full_count : 0);
  });
}

function getShortlistedContactsForUser(req, res) {
  var user_id = req.params.id;
  var limit = req.body.limit || 20
  if (limit > 200)
    limit = 200;
  var offset = req.body.offset || 0

  Contact.getShortlisted(user_id, limit, offset, function(err, contacts) {
    if(err)
      return res.error(err);

    if(!contacts) {
      res.status(200);
      res.end();
      return ;
    }

    res.collection(contacts, offset, (contacts[0]) ? contacts[0].full_count : 0);
  });
}

function addContactForUser(req, res) {
  var user_id = req.params.id;
  var contact_id = req.body.contact_id;

  Contact.add(user_id, contact_id, function(err, ok) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
    return;
  });
}

function deleteContactForUser(req, res) {
  var user_id = req.params.id;
  var contact_id = req.body.contact_id;

  Contact.delete(user_id, contact_id, function(err, ok) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
    return;
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/users/:id/contacts', b(getContactsForUser));
  app.get('/users/:id/shortlisted_contacts', b(getShortlistedContactsForUser));
  app.post('/users/:id/contacts', b(addContactForUser));
  app.delete('/users/:id/contacts', b(deleteContactForUser));
}

module.exports = router;