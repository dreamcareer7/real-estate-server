var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');

Property = {};

var schema = {
  type: 'object',
  properties: {
    property_type: {
      type: 'string',
      required: true,
      enum: ['Residential', 'Residential Lease', 'Multi-Family', 'Commercial' ,'Lots & Acreage'],
    },

    property_subtype: {
      type: 'string',
      required: true,
      enum: ['MUL-Apartment/5Plex+', 'MUL-Fourplex', 'MUL-Full Duplex', 'MUL-Multiple Single Units', 'MUL-Triplex',
             'LSE-Apartment', 'LSE-Condo/Townhome', 'LSE-Duplex', 'LSE-Fourplex', 'LSE-House', 'LSE-Mobile', 'LSE-Triplex',
             'LND-Commercial', 'LND-Farm/Ranch', 'LND-Residential',
             'RES-Condo', 'RES-Farm/Ranch', 'RES-Half Duplex', 'RES-Single Family', 'RES-Townhouse',
             'COM-Lease', 'COM-Sale' ,'COM-Sale or Lease (Either)', 'COM-Sale/Leaseback (Both)']
    },

    bedroom_count: {
      type: 'number',
      required: true
    },

    bathroom_count: {
      type: 'number',
      required: true
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    parking_spaces_covered_total: {
      type: 'number',
      required: false
    },

    year_built: {
      type: 'number',
      required: false
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Property object
var sql_get = require('../sql/property/get.sql');
var sql_get_mui = require('../sql/property/get_mui.sql');
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

Property.getByMUI = function(id, cb) {
  db.query(sql_get_mui, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound());

    Property.get(res.rows[0].id, cb);
  });
}

function insert(property, cb) {
    db.query(sql_insert, [
      property.property_type,
      property.property_subtype,
      property.bedroom_count,
      property.bathroom_count,
      property.address_id,
      property.matrix_unique_id,
      property.description,
      property.square_meters,
      property.lot_square_meters,
      property.year_build,
      property.parking_spaces_covered_total,
      property.accessibility_features,
      property.bedroom_bathroom_features,
      property.commercial_features,
      property.community_features,
      property.energysaving_features,
      property.exterior_features,
      property.interior_features,
      property.farmranch_features,
      property.fireplace_features,
      property.lot_features,
      property.parking_features,
      property.pool_features,
      property.security_features,
      property.half_bathroom_count,
      property.full_bathroom_count,
      property.heating
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

Property.update = function(id, property, cb) {
  Property.get(id, function(err, data) {
    if(err)
      return cb(err);

    db.query(sql_update, [property.property_type,
                          property.property_subtype,
                          property.bedroom_count,
                          property.bathroom_count,
                          property.description,
                          property.square_meters,
                          property.lot_square_meters,
                          property.year_built,
                          property.parking_spaces_covered_total,
                          property.accessibility_features,
                          property.bedroom_bathroom_features,
                          property.commercial_features,
                          property.community_features,
                          property.energysaving_features,
                          property.exterior_features,
                          property.interior_features,
                          property.farmranch_features,
                          property.fireplace_features,
                          property.lot_features,
                          property.parking_features,
                          property.pool_features,
                          property.security_features,
                          property.half_bathroom_count,
                          property.full_bathroom_count,
                          property.heating,
                          id],
             function(err, res) {
               if(err)
                 return cb(err);

               Property.get(id, cb);
             });
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

  if (model.address) Address.publicize(model.address);

  delete model.address_id;

  return model;
}

module.exports = function(){};