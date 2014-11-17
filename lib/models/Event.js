var validator = require('validator');
var db = require('../utils/db.js');

Event = {};

function validate(event, cb) {
  var int = ['user_id', 'timestamp', 'subject_id'];
  for(var i in int) {
    var p = int[i];

    event[p] = parseInt(event[p]);
  }

  var required = ['action', 'user_id', 'timestamp', 'subject_type', 'subject_id'];
  for(var i in required) {
    var p = required[i];

    if(validator.isNull(event[p])) {
      return cb(Error.Validation(p+' is required'));
    }
  }

  cb();
}

var insert_sql = 'INSERT INTO events (action, user_id, timestamp, subject_type, subject_id) VALUES ($1,$2,to_timestamp($3),$4,$5)';

Event.create = function(event, cb) {
  validate(event, function(err) {
    if(err)
      return cb(err);

    db.query(insert_sql, [
      event.action,
      event.user_id,
      event.timestamp,
      event.subject_type,
      event.subject_id
    ], cb);
  });
}

module.exports = function(){};