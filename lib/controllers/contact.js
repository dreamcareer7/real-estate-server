var async = require('async');

function getContacts(req, res) {
  var user_id = req.user.id;
  var paging = {};

  if (req.query.tags) {
    Contact.getByTags(user_id, req.query.tags, function(err, contacts){
      if (err)
        return res.error(err);

      return res.collection(contacts);
    });
  } else {
    req.pagination(paging);

    Contact.getForUser(user_id, paging, function (err, contacts) {
      if (err)
        return res.error(err);

      return res.collection(contacts);
    });
  }
}

function addContact(req, res) {
  var user_id = req.user.id;
  var contacts = req.body.contacts;

  if (!Array.isArray(contacts))
    return res.error(Error.Validation('You must supply an array of contacts'));

  async.map(contacts, function (r, cb) {
    Contact.add(user_id, r, cb);
  }, function (err, contacts) {
    if (err)
      return res.error(err);

    contacts = contacts.filter(Boolean);
    return res.collection(contacts);
  });
}

function patchContactAvatars(req, res, type, link) {
  var contact_id = req.params.id;

  Contact.patchAvatars(contact_id, type, link, function (err) {
    if (err)
      return res.error(err);

    Contact.get(contact_id, function (err, contact) {
      if (err)
        return res.error(err);

      return res.model(contact);
    });
  });
}

function patchContactProfileImage(req, res) {
  return patchContactAvatars(req, res, 'Profile', req.body.profile_image_url);
}

function patchContactCoverImage(req, res) {
  return patchContactAvatars(req, res, 'Cover', req.body.cover_image_url);
}

function deleteContact(req, res) {
  var user_id = req.user.id;
  var contact_id = req.params.id;

  Contact.delete(contact_id, function (err) {
    if (err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function updateContact(req, res) {
  var contact_id = req.params.id;
  var user_id = req.user.id;
  var contact = req.body;

  Contact.patch(contact_id, user_id, contact, function (err) {
    if (err)
      return res.error(err);

    Contact.get(contact_id, function (err, contact) {
      if (err)
        return res.error(err);

      return res.model(contact);
    });
  });
}

function stringSearch(req, res) {
  var user_id = req.user.id;
  var strings = ObjectUtil.queryStringArray(req.query.q);

  Contact.stringSearch(user_id, strings, function (err, contacts) {
    if (err)
      return res.error(err);

    return res.collection(contacts);
  });
}

/**
 * Adds a `Tag` to a `Contact`
 * @name addTag
 * @memberof controller/contact
 * @instance
 * @function
 * @public
 * @summary POST /contacts/:id/tags
 * @param {request} req - request object
 * @param {response} res - response object
 */
function addTag(req, res) {
  var contact_id = req.params.id;
  var tags = req.body.tags;
  var user_id = req.user.id;

  if (!Array.isArray(tags))
    return res.error(Error.Validation('You must supply an array of tags'));

  Contact.addTag(contact_id, tags, user_id, function (err) {
    if (err)
      return res.error(err);

    Contact.get(contact_id, function (err, contact) {
      if (err)
        return res.error(err);
      return res.model(contact);
    })
  });
}

/**
 * Removes a `Tag` from a `Contact`
 * @name removeTag
 * @memberof controller/contact
 * @instance
 * @function
 * @public
 * @summary DELETE /contacts/:id/tags/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function removeTag(req, res) {
  var contact_id = req.params.id;
  var tag_id = req.params.tid;
  var user_id = req.params.id;

  Contact.removeTag(contact_id, tag_id, user_id, function (err) {
    if (err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function getContactTags(req, res) {
  var user_id = req.user.id;
  var paging = {};
  req.pagination(paging);

  Contact.getForUser(user_id, paging, function (err, contacts) {
    if (err)
      return res.error(err);

    return res.collection(contacts);
  });
}

var router = function (app) {
  var b = app.auth.bearer;

  app.get('/contacts/search', b(stringSearch));
  app.get('/contacts', b(getContacts));
  app.post('/contacts', b(addContact));
  app.put('/contacts/:id', b(updateContact));
  app.delete('/contacts/:id', b(deleteContact));
  app.patch('/contacts/:id/profile_image_url', b(patchContactProfileImage));
  app.patch('/contacts/:id/cover_image_url', b(patchContactCoverImage));
  app.post('/contacts/:id/tags', b(addTag));
  app.delete('/contacts/:id/tags/:tid', b(removeTag));
};

module.exports = router;
