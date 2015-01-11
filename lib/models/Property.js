var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');

Property = {};

var schema = {
  type:'object',
  properties: {
    property_type: {
      type:'string',
      required:true
    },

    bedroom_count: {
      type:'number',
      required:true
    },

    bathroom_count: {
      type:'number',
      required:true
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Property object
var sql_get = require('../sql/property/get.sql');
var sql_insert = require('../sql/property/insert.sql');
var sql_update = require('../sql/property/update.sql');
var sql_delete = require('../sql/property/delete.sql');
var sql_set_address = require('../sql/property/set_address.sql');
var sql_unset_address = require('../sql/property/unset_address.sql');

Property.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows[0]);
  });
}

function insert(property, cb) {
    db.query(sql_insert, [
      property.proper_type,
      property.bedroom_count,
      property.bathroom_count,
      property.description,
      property.square_meters
    ], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows[0].id);
    });
}

Property.create = function(property, cb) {
  validate(property, function(err) {
    if(err)
      return cb(err);

    insert(property, cb);
  });
}

Property.update = function(property_id, property, cb) {
  validate(property, function(err) {
    if(err)
      return cb(err);

    db.query(sql_update, [
      property.property_type,
      property.bedroom_count,
      property.bathroom_count,
      property.description,
      property.square_meters,
      property.address_id,
      property_id
    ], cb);
  });
}

Property.delete = function(id, cb) {
  db.query(sql_delete, [id], function(err, res) {
    if(err)
      return cb(err);

    Property.unsetAddress(id, cb);
  });
}

Property.getAddress = function(property_id, cb) {
  Property.get(property_id, function(err, property) {
    if(err)
      return cb(err);

    if(!property || !property.address_id)
      return cb(null, false);

    Address.get(property.address_id, cb);
  });
}

Property.setAddress = function(property_id, address, cb) {
  Address.create(address, function(err, addr_id) {
    if(err)
      return cb(err);

    db.query(sql_set_address, [addr_id, property_id], cb);
  });
}

Property.unsetAddress = function(property_id, cb) {
  Property.get(property_id, function(err, property) {
    if(err)
      return cb(err);

    if(!property || !property.address_id)
      return cb();

    Address.delete(property.address_id);

    db.query(sql_unset_address, [property_id], cb);
  });
}

Property.publicize = function(model) {
  if (!model.address_id)
    model.address = null;

  delete model.address_id;
}

module.exports = function(){};