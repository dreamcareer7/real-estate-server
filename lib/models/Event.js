var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

Event = {};

var schema = {
  type:'object',
  properties: {
    action: {
      required:true,
      type:'string'
    },

    user_id: {
      required:true,
      type:'number',
    },

    timestamp: {
      required:true,
      type:'number',
      format:'utc-milisec'
    },

    subject_id: {
      required:true,
      type:'number',
    }
  }
}

var validate = validator.bind(null, schema);

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