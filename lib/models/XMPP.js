var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');
var validator = require('../utils/validator.js');
var async = require('async');

XMPP = {};

var sql_get_passwd = require('../sql/mongooseim/get_passwd.sql');
var sql_check_passwd = require('../sql/mongooseim/check_passwd.sql');
var sql_check_user = require('../sql/mongooseim/check_user.sql');

XMPP.checkPassword = function(user, password, cb) {
  db.query(sql_check_passwd, [user, password], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1) {
      return cb(null, false);
    }

    cb(null, true);
  });
}

XMPP.userExists = function(user, cb) {
  db.query(sql_check_user, [user], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1) {
      return cb(null, false);
    }

    cb(null, true);
  });
}

XMPP.getPassword = function(user, cb) {
  db.query(sql_get_passwd, [user], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1) {
      return cb(null, false);
    }

    cb(null, res.rows[0].token);
  });
}

module.exports = function(){};