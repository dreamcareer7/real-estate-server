var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var fs = require('fs');

Session = {};

var schema = {
  type:'object',
  properties: {
    device_uuid: {
      required:true,
      type:'string',
      uuid:true
    },

    device_name: {
      required:true,
      type:'string',
    },

    client_version: {
      required:true,
      type:'string',
    }
  }
}

var validate = validator.bind(null, schema);

var insert_sql = 'INSERT INTO sessions (device_uuid, device_name, client_version) VALUES ($1,$2,$3)';

Session.create = function(session, cb) {
  validate(session, function(err) {
    if(err)
      return cb(err);

    db.query(insert_sql, [
      session.device_uuid,
      session.device_name,
      session.client_version
    ], cb);
  });
}

var get_state = 'SELECT response FROM clients WHERE version = $1';
Session.getState = function(session, cb) {
  validate(session, function(err) {
    if(err)
      return cb(err);

    db.query(get_state, [session.client_version], function(err, res) {
      if(err)
        return cb(err);

      if(!res.rows[0])
        return cb(null, {
          type: 'session',
          api_base_url: 'https://api.shortlisted.com:443',
          client_version_status: 'UPGRADE_UNAVAILABLE',
        });

      cb(null, res.rows[0].response);
    });
  });
}

module.exports = function(){};