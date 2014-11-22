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

Session.getState = function(session, cb) {
  validate(session, function(err) {
    if(err)
      return cb(err);

      var filename = './lib/data/client_info.json';

      fs.readFile(filename, function(err, data) {
        if(err)
          return cb(Error.FS(err));

        var json = JSON.parse(data.toString());
        if(json.clients[session.client_version])
          cb(null, json.clients[session.client_version]);
      });
  });
}

module.exports = function(){};