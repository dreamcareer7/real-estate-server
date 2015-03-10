var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');

Address = {};

var schema = {
  type:'object',
  properties: {
    title:{
      type:'string',
      required:true
    },

    subtitle:{
      type:'string',
      required:true
    }
  }
}

Address.validate = validator.bind(null, schema);

var sql_get = require('../sql/address/get.sql');
var sql_create = require('../sql/address/create.sql');
var sql_delete = require('../sql/address/delete.sql');

Address.delete = function(id, cb) {
  db.query(sql_delete, [id], cb);
}

Address.create = function(address, cb) {
  Address.validate(address, function(err) {
    if(err)
      return cb(err);

    db.query(sql_create, [
      address.title,
      address.subtitle,
      address.street_prefix,
      address.street_number,
      address.street_name,
      address.city,
      address.state,
      address.state_code,
      address.country,
      address.country_code,
      address.unit_number,
      address.postal_code,
      address.neighborhood,
      address.location.latitude,
      address.location.longitude
    ], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows[0].id);
    });
  });
}

Address.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, res.rows[0]);
  });
}

Address.publicize = function(model) {
  var location = JSON.parse(model.location);
  model.location = {longitude: location.coordinates[0], latitude: location.coordinates[1], type: 'location'};

  return model;
}

module.exports = function(){};