var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var sql = require('../utils/require_sql.js');
var async = require('async');

Contact = {};

var schema = {
  type: 'object',
  properties: {
    user_id: {
      uuid: true,
      type: 'string',
      required: true
    },

    contact_id: {
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
var sql_get = require('../sql/contact/get.sql');
var sql_add = require('../sql/contact/add.sql');
var sql_delete = require('../sql/contact/delete.sql');
var sql_get_shortlist = require('../sql/contact/get_shortlist.sql');

function getContacts(family, user_id, paging, cb) {
  db.query(family, [user_id, paging.type, paging.id, paging.ascending, paging.limit], function(err, res) {
    if(err)
      return cb(err);

    var contact_ids = res.rows.map(function(r) {
                        return r.contact_id
                      });

    async.map(contact_ids, User.get, function(err, contacts) {
      cb(null, contacts);
    });
  });
}

Contact.getByUser = function(user_id, paging, cb) {
  getContacts(sql_get, user_id, paging, cb);
}

Contact.getShortlisted = function(user_id, paging, cb) {
  getContacts(sql_get_shortlist, user_id, paging, cb);
}

Contact.add = function(user_id, contact_id, cb) {
  db.query(sql_add, [user_id, contact_id], function(err, res) {
    if(err) {
      if (err.code == '23505')
        return cb(Error.Conflict())

      return cb(err);
    }

    cb(null, false);
  });
}

Contact.delete = function(user_id, contact_id, cb) {
  db.query(sql_delete, [user_id, contact_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, false);
  });
}

Contact.publicize = function(model) {
  return model;
}
