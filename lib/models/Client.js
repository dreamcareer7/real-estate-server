var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var fs = require('fs');
var sql = require('../utils/require_sql.js');

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

// SQL queries to work with Client object
var sql_get = require('../sql/client/get.sql');

Client.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(!res.rows[0])
      return cb(null, false);

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};