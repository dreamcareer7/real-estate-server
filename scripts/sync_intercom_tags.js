require('./connection.js');

var db      = require('../lib/utils/db.js');
var sql     = require('../lib/utils/require_sql.js');
var async   = require('async');
var request = require('request');

require('../lib/models/index.js');

var tagUser = function(id, cb) {
  User.get(id, (err, user) => {
    if(err) {
      // Dont give the error back, as it would break tagging of all other users
      return cb();
    }

    if(user.user_type !== 'Agent')
      return cb();

    Intercom.User.tag(user.user_type, user.id);
    cb();
  });
}

User.getAll( (err, users) => {
  if(err) {
    console.log(err);
    return ;
  }

  async.eachLimit(users, 20, tagUser, (err) => {
    if(err) {
      console.log(err);
      process.exit();
    }

    setTimeout(process.exit, 10000);
  })
})