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
      minLength: 2,
      maxLength: 30
    },

    last_name: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 30
    },

    email: {
      type: 'string',
      format: 'email',
      maxLength: 50,
      required: false
    },

    phone_number:  {
      type: 'string',
      minLength: 2,
      maxLength: 20
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with User object
var sql_get    = require('../sql/contact/get.sql');
var sql_add    = require('../sql/contact/add.sql');
var sql_delete = require('../sql/contact/delete.sql');
var sql_update = require('../sql/contact/update.sql');

function getContacts(family, user_id, paging, cb) {
  db.query(family, [user_id, paging.type, paging.timestamp, paging.limit], function(err, res) {
    if(err)
      return cb(err);

    async.map(res.rows, function(contact, cb) {
      var res = _u.clone(contact);

      async.parallel({
        contact: function(cb) {
          if(!contact.contact)
            return cb();

          return User.get(contact.contact, cb);
        }
      }, function(err, results) {
           if(err)
             return cb(err);

           res.contact = results.contact || null;

           return cb(null, res);
         });
    }, function(err, contacts) {
         if(err)
           return cb(err);

      return cb(null, contacts);
    });
  });
}

Contact.getForUser = function(user_id, paging, cb) {
  getContacts(sql_get, user_id, paging, cb);
}

Contact.add = function(user_id, contact, cb) {
  contact.user = user_id;

  validate(contact, function(err) {
    if(err)
      return cb(err);

    db.query(sql_add, [user_id,
                       contact.contact,
                       contact.first_name,
                       contact.last_name,
                       contact.phone_number,
                       contact.email],
             function(err, res) {
               if(err) {
                 if (err.code == '23505')
                   return cb(Error.Conflict())

                 return cb(err);
               }

               return cb();
             });
  });
}

Contact.delete = function(contact_id, cb) {
  db.query(sql_delete, [contact_id], cb);
}

Contact.update = function(contact_id, contact, cb) {
  contact.user = contact_id;

  validate(contact, function(err) {
    if(err)
      return cb(err);

    db.query(sql_update, [contact.contact,
                          contact.first_name,
                          contact.last_name,
                          contact.phone_number,
                          contact.email,
                          contact_id], cb);
  });
}

Contact.publicize = function(model) {
  if(model.user) User.publicize(model.user);
  if(model.contact) User.publicize(model.contact);

  return model;
}

module.exports = function(){};