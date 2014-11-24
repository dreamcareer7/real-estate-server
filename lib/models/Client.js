var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var fs = require('fs');

Client = {};

var schema = {
  type:'object',
  properties: {
    name: {
      required:true,
      type:'string',
    },

    version : {
      required:true,
      type:'string'
    },

    secret: {
      required:true,
      type:'string',
      uuid:true
    },

    response: {
      required:true,
      type:'object',
    }
  }
}

var validate = validator.bind(null, schema);

var get_client = 'SELECT * FROM clients WHERE id = $1';
Client.get = function(id, cb) {
  db.query(get_client, [id], function(err, res) {
    if(err)
      return cb(err);

    if(!res.rows[0])
      return cb(null, false);

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};