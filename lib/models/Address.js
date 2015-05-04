var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');
var request = require('request');
var config = require('../config.js');
var gm = require('googlemaps');

Address = {};

var schema = {
  type: 'object',
  properties: {
    title:{
      type: 'string',
      required: true
    },

    subtitle:{
      type: 'string',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

var sql_get = require('../sql/address/get.sql');
var sql_get_mui = require('../sql/address/get_mui.sql');
var sql_create = require('../sql/address/create.sql');
var sql_update = require('../sql/address/update.sql');
var sql_delete = require('../sql/address/delete.sql');
var sql_batch_latlong = require('../sql/address/batch_latlong.sql');
var sql_update_latlong = require('../sql/address/update_latlong.sql');

Address.delete = function(id, cb) {
  db.query(sql_delete, [id], cb);
}

Address.create = function(address, cb) {
  validate(address, function(err) {
    if(err)
      return cb(err);

    db.query(sql_create, [
      address.title,
      address.subtitle,
      address.street_suffix,
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
      address.matrix_unique_id
    ], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows[0].id);
    });
  });
}

Address.update = function(id, address, cb) {
  Address.get(id, function(err, data) {
    if(err)
      return cb(err);

    db.query(sql_update, [address.title,
                          address.subtitle,
                          address.street_suffix,
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
                          id],
             function(err, res) {
               if(err)
                 return cb(err);

               Address.get(id, cb);
             });
  });
}

Address.getOSMGeocodingSearchString = function(address) {
  var standard = '';
  standard += (address.street_number) ? (address.street_number + ' ') : '';
  standard += (address.street_name) ? (address.street_name + ', ') : '';
  standard += (address.city) ? (address.city + ', ') : '';
  standard += (address.state_code) ? (address.state_code) : '';
  standard = standard.replace(/\ /g, '+');
  standard = standard.replace(/,/g, '%2C');

  return standard + '&format=json';
}

Address.getGoogleGeocodingSearchString = function(address) {
  var standard = address.street_number + ' ' + address.street_name + ', ' + address.city + ', ' + address.state_code;

  return standard;
}

Address.updateGeoFromOSM = function(id, cb) {
  Address.get(id, function(err, address) {
    if(err)
      return cb(err);

    var standard = Address.getOSMGeocodingSearchString(address);
    request(config.osm.url + standard, function(err, response, body) {
      if(err)
        return cb(err);

      if(body) {
        try {
          body = JSON.parse(body);
          if(body[0]) {
            var location = {};
            location.latitude = body[0].lat;
            location.longitude = body[0].lon;

            console.log('(OSM) NOTICE: UPDATING LAT/LONG for address with id:', id, 'location:', location);
            return Address.updateLatLong(id, location, cb);
          } else {
            console.log('(OSM) WARNING: Error geocoding an address with id:', id);
            return cb(null, false);
          }
        } catch (e) {
          console.log('(OSM) WARNING [3]: Error geocoding an address with id:', id);
          return cb(null, false);
        }
      } else {
        console.log('(OSM) WARNING [2]: Error geocoding an address with id:', id);
        return cb(null, false);
      }
    });
  });
}

Address.updateGeoFromGoogle = function(id, cb) {
  Address.get(id, function(err, address) {
    if(err)
      return cb(err);

    gm.geocode(Address.getGoogleGeocodingSearchString(address), function(err, data) {
      // console.log('DEBUG:', JSON.stringify(data));
      if (!data)
        return cb(null, 'No data received for address with id: ' + id);

      if (data.status === 'OK') {
        var location = {};

        location.latitude = data.results[0].geometry.location.lat;
        location.longitude = data.results[0].geometry.location.lng;

        console.log('(Google) NOTICE: UPDATING LAT/LONG for address with id:', id, 'location:', location);
        Address.updateLatLong(id, location, function(err, res) {
          if(err)
            return cb(err);

          return cb(null, false);
        });
      } else {
        console.log('(Google) Warning: Error geocoding an address with id:', id);
        return cb(null, false);
      }
    });
  });
}

Address.updateLatLong = function(id, location, cb) {
  console.log('UpdateLatLong():', location);
  Address.get(id, function(err, data) {
    if(err)
      return cb(err);

    db.query(sql_update_latlong, [location.longitude,
                                  location.latitude,
                                  id],
             function(err, res) {
               if(err)
                 return cb(err);

               Address.get(id, cb);
             });
  });
}

Address.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    var model = res.rows[0];
    if (model.location) {
      var location = JSON.parse(model.location);
      model.location = {longitude: location.coordinates[0], latitude: location.coordinates[1], type: 'location'};
    }

    return cb(null, model);
  });
}

Address.getBatchOfAddressesWithoutLatLong = function(limit, cb) {
  console.log('limit =', limit);
  db.query(sql_batch_latlong, [limit], function(err, res) {
    if(err)
      return cb(err);

    var address_ids = res.rows.map(function(r) {
                        return r.id;
                      });

    return cb(null, address_ids);
  });
}

Address.getByMUI = function(id, cb) {
  db.query(sql_get_mui, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound());

    Address.get(res.rows[0].id, cb);
  });
}

Address.publicize = function(model) {
  return model;
}

module.exports = function(){};