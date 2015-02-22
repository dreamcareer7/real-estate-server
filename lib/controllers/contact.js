function getContactsForUser(req, res) {
  var user_id = req.params.id;
  var paging = {};

  req.pagination(paging);
  Contact.getByUser(user_id, paging, function(err, contacts) {
    if(err)
      return res.error(err);

    if(!contacts) {
      res.status(200);
      res.end();
      return ;
    }

    res.collection(contacts);
  });
}

function getShortlistedContactsForUser(req, res) {
  var user_id = req.params.id;
  var paging = {};

  req.pagination(paging);
  Contact.getShortlisted(user_id, paging, function(err, contacts) {
    if(err)
      return res.error(err);

    if(!contacts) {
      res.status(200);
      res.end();
      return ;
    }

    res.collection(contacts);
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