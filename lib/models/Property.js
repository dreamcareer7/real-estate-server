var validator = require('../utils/validator.js');
var db = require('../utils/db.js');

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

var get_sql = "SELECT\
 'property' AS type,\
 properties.*,\
 row_to_json(addresses.*) AS address\
 FROM properties\
 LEFT JOIN addresses\
 ON properties.address_id = addresses.id\
 WHERE properties.id = $1";

Property.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
        return cb(null, false);

    cb(null, res.rows[0]);
  });
}

var insert_sql = 'INSERT INTO properties (property_type,bedroom_count,bathroom_count,description) VALUES ($1,$2,$3,$4) RETURNING id';
function insert(property, cb) {
    db.query(insert_sql, [
      property.proper_type,
      property.bedroom_count,
      property.bathroom_count,
      property.description,
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


var update_sql = 'UPDATE properties SET proper_type = $1, bedroom_count = $2, bedroom_count = $3, description, address_id = $4 WHERE id = $5';

Property.update = function(property_id, property, cb) {
  validate(property, function(err) {
    if(err)
      return cb(err);

    db.query(update_sql, [
      property.proper_type,
      property.bedroom_count,
      property.bathroom_count,
      property.description,
      property_id
    ], cb);
  });
}

var delete_sql = 'DELETE FROM properties WHERE id = $1';
Property.delete = function(id, cb) {
  db.query(delete_sql, [id], function(err, res) {
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

var set_address_sql = 'UPDATE properties SET address_id = $1 WHERE id = $2';
Property.setAddress = function(property_id, address, cb) {
  Address.create(address, function(err, addr_id) {
    if(err)
      return cb(err);

    db.query(set_address_sql, [addr_id, property_id], cb);
  });
}

var unset_address_sql = 'UPDATE properties SET address_id = null WHERE id = $1';
Property.unsetAddress = function(property_id, cb) {
  Property.get(property_id, function(err, property) {
    if(err)
      return cb(err);

    if(!property || !property.address_id)
      return cb();

    Address.delete(property.address_id);

    db.query(unset_address_sql, [property_id_id], cb);
  });
}

Property.publicize = function(model) {
  delete model.address_id;
}

module.exports = function(){};