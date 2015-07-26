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

// SQL queries to work with Session object
var sql_insert = require('../sql/session/insert.sql');
var sql_get_state = require('../sql/session/get_state.sql');

Session.create = function(session, cb) {
  validate(session, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
      session.device_uuid,
      session.device_name,
      session.client_version
    ], cb);
  });
}

Session.getState = function(session, cb) {
  validate(session, function(err) {
    if(err)
      return cb(err);

    db.query(sql_get_state, [session.client_version], function(err, res) {
      if(err)
        return cb(err);

      if(!res.rows[0])
        return cb(null, {
          type: 'session',
          api_base_url: 'https://api.shortlisted.co:443',
          client_version_status: 'UpgradeUnavailable',
        });

      cb(null, res.rows[0].response);
    });
  });
}

module.exports = function(){};