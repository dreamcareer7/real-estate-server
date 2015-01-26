var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');
var validator = require('../utils/validator.js');
var async = require('async');

XMPP = {};

var sql_check_passwd = require('../sql/mongooseim/check_passwd.sql');

XMPP.checkPassword = function(user, password, cb) {
  db.query(sql_check_passwd, [user, password], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1) {
      console.log('Auth Failed');
      return cb(null, false)
    }

    console.log('Auth Success');
    cb(null, true);
  });
}

module.exports = function(){};