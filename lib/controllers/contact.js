var async = require('async');

function getContacts(req, res) {
  var user_id = req.user.id;
  var paging = {};
  req.pagination(paging);

  Contact.getForUser(user_id, paging, function(err, contacts) {
    if(err)
      return res.error(err);

    return res.collection(contacts);
  });
}

function addContact(req, res) {
  var user_id = req.user.id;
  var contacts = req.body;

  if(!Array.isArray(contacts))
    return res.error(Error.Validation('You must supply an array of contacts'));

  async.map(contacts, function(r, cb) {
    return Contact.add(user_id, r, cb);
  }, function(err, contacts) {
    if(err)
      return res.error(err);

    res.status(200);
    return res.collection(contacts);
  });
}

function deleteContact(req, res) {
  var user_id = req.user.id;
  var contact_id = req.params.id;

  Contact.delete(contact_id, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function updateContact(req, res) {
  var contact_id = req.params.id;
  var contact = req.body;

  Contact.update(contact_id, contact, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function stringSearch(req, res) {
  var user_id = req.user.id;
  var string = req.query.q || '';

  Contact.stringSearch(user_id, string, function(err, contacts) {
    if(err)
      return res.error(err);

    return res.collection(contacts);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/contacts/search', b(stringSearch));
  app.get('/contacts', b(getContacts));
  app.post('/contacts', b(addContact));
  app.put('/contacts/:id', b(updateContact));
  app.delete('/contacts/:id', b(deleteContact));
};

module.exports = router;
