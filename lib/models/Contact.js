/**
 * @namespace Contact
 */

var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var sql = require('../utils/require_sql.js');
var async = require('async');
var _u = require('underscore');

Contact = {};

var schema = {
  type: 'object',
  properties: {
    user: {
      uuid: true,
      type: 'string',
      required: true
    },

    contact: {
      uuid: true,
      type: 'string',
      required: false
    },

    first_name: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 30
    },

    last_name: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 30
    },

    phone_number:  {
      type: 'string',
      minLength: 2,
      maxLength: 20
    },

    email: {
      type: 'string',
      format: 'email',
      maxLength: 50,
      required: false
    },

    cover_image_url: {
      type: 'string',
      required: false
    },

    profile_image_url: {
      type: 'string',
      required: false
    },

    invitation_url: {
      type: 'string',
      required: false
    },

    company: {
      type: 'string',
      required: false
    },

    address: {
      type: 'object',
      required: false
    }
  }
};

var validate = validator.bind(null, schema);

// SQL queries to work with User object
var sql_get    = require('../sql/contact/get.sql');
var sql_user   = require('../sql/contact/user.sql');
var sql_add    = require('../sql/contact/add.sql');
var sql_delete = require('../sql/contact/delete.sql');
var sql_update = require('../sql/contact/update.sql');
var sql_search = require('../sql/contact/search.sql');
var sql_patch  = require('../sql/contact/patch.sql');

function getContacts(family, user_id, paging, cb) {
  db.query(family, [user_id, paging.type, paging.timestamp, paging.limit], function(err, res) {
    if(err)
      return cb(err);

    var contact_ids = res.rows.map(function(r) {
                        return r.id;
                      });

    async.map(contact_ids, Contact.get, function(err, contacts) {
      if(err)
        return cb(err);

      return cb(null, contacts);
    });
  });
}

Contact.getForUser = function(user_id, paging, cb) {
  getContacts(sql_user, user_id, paging, cb);
};

Contact.get = function(contact_id, cb) {
  db.query(sql_get, [contact_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.legnth < 1)
      return cb(Error.ResourcNotFound());

    var contact = res.rows[0];
    async.parallel({
      contact_user: function(cb) {
        if(!contact.contact_user)
          return cb();

        return User.getCompact(contact.contact_user, cb);
      }
    }, function(err, results) {
         contact.contact_user = results.contact_user || null;

         return cb(null, contact);
    });
  });
};

Contact.add = function(user_id, contact, cb) {
  contact.user = user_id;

  async.auto({
    resolve: function(cb) {
      Contact.resolve(contact.email, contact.phone_number, cb);
    },
    validate: ['resolve',
               function(cb, results) {
                 contact.contact_user = results.resolve;

                 validate(contact, cb);
               }],
    create: ['resolve',
             'validate',
             function(cb, results) {
               if(contact.force_creation || contact.contact_user) {
                 db.query(sql_add, [user_id,
                                    contact.contact_user,
                                    contact.first_name,
                                    contact.last_name,
                                    contact.phone_number,
                                    contact.email,
                                    contact.cover_image_url,
                                    contact.profile_image_url,
                                    contact.invitation_url,
                                    contact.company,
                                    contact.birthday,
                                    contact.address],
                          function(err, res) {
                            if(err) {
                              if (err.code == '23505')
                                return cb(Error.Conflict());

                              return cb(err);
                            }

                            return cb(null, res.rows[0].id);
                          });
               } else {
                 return cb();
               }
             }],
    get: ['create',
          function(cb, results) {
            if(results.create)
              return Contact.get(results.create, cb);

            return cb();
          }]
  }, function(err, results) {
    if(err)
      return cb(err);

    return cb(null, results.get);
  });
};

Contact.delete = function(contact_id, cb) {
  db.query(sql_delete, [contact_id], cb);
};

Contact.update = function(contact_id, user_id, contact, cb) {
  contact.user = user_id;

  Contact.resolve(contact.email, contact.phone_number, function(err, contact_user_id) {
    if(err)
      return cb(err);

    contact.contact_user = contact_user_id;
    for (var i in contact)
      if (contact[i] === null)
        delete contact[i];

    validate(contact, function(err) {
      if(err)
        return cb(err);

      db.query(sql_update, [contact.contact_user,
                            contact.first_name,
                            contact.last_name,
                            contact.phone_number,
                            contact.email,
                            contact.cover_image_url,
                            contact.profile_image_url,
                            contact.invitation_url,
                            contact.company,
                            contact.birthday,
                            contact.address,
                            contact_id], cb);
    });
  });
};

Contact.resolve = function(email, phone_number, cb) {
  User.getByEmail(email, function(err, user_email) {
    if(err)
      return cb(err);

    User.getByPhoneNumber(phone_number, function(err, user_phone) {
      if(err)
        return cb(err);

      if(user_email && user_phone)
        return cb(null, user_email.id);

      else if(user_email && !user_phone)
        return cb(null, user_email.id);

      else if(!user_email && user_phone)
        return cb(null, user_phone.id);

      else
        return cb(null, null);
    });
  });
};

Contact.stringSearch = function(user_id, string, cb) {
  db.query(sql_search, [user_id, '.*' + string + '.*'], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var contact_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(contact_ids, Contact.get, function(err, contacts) {
      if(err)
        return cb(err);

      return cb(null, contacts);
    });
  });
};

Contact.patchAvatars = function(contact_id, type, link, cb) {
  console.log(type, link);
  if(type != 'Profile' && type != 'Cover')
    return cb(Error.Validation('Invalid patch type'));

  return db.query(sql_patch, [contact_id, type, link], cb);
};

Contact.publicize = function(model) {
  if(model.contact_user) User.publicize(model.contact_user);
  if(model.user) delete model.user;

  return model;
};

module.exports = function(){};
