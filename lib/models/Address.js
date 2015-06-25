var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var sql = require('../utils/require_sql.js');
var request = require('request');
var config = require('../config.js');
var GoogleMapsAPI = require('googlemaps');
var qs = require('querystring');

var gm_config = {
  google_private_key: config.google.api_key,
  secure: true,
  stagger_time: 1000
};

var gm = new GoogleMapsAPI(gm_config);

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
var sql_batch_latlong_google = require('../sql/address/batch_latlong_google.sql');
var sql_batch_latlong_bing = require('../sql/address/batch_latlong_bing.sql');
var sql_update_latlong = require('../sql/address/update_latlong.sql');
var sql_update_latlong_partial = require('../sql/address/update_latlong_partial.sql');
var sql_map_to_listing = require('../sql/address/map_to_listing.sql');

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
      address.matrix_unique_id,
      address.county_or_parish,
      address.direction,
      address.street_dir_prefix,
      address.street_dir_suffix,
      address.street_number_searchable
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
                          address.county_or_parish,
                          address.direction,
                          address.street_dir_prefix,
                          address.street_dir_suffix,
                          address.street_number_searchable,
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

Address.getGoogleGeocodingSearchStringDirect = function(address) {
  var standard = '';
  standard += (address.street_number) ? (' ' + address.street_number + ' ') : '';
  standard += (address.street_dir_prefix) ? (' ' + address.street_dir_prefix + ' ') : '';
  standard += (address.street_name) ? (' ' + address.street_name) : '';
  standard += (address.street_suffix) ? (' ' + address.street_suffix): '';
  standard += (address.street_dir_suffix) ? (' ' + address.street_dir_suffix + ', '): ', ';
  standard += (address.city) ? (address.city + ', ') : '';
  standard += (address.state_code) ? (' ' + address.state_code + ' ') : '';
  standard += (address.postal_code) ? (' ' + address.postal_code + ' ') : '';
  standard = standard.trim();
  standard = standard.replace(/\s\s+/g, ' ');

  return standard;
}

Address.mapToListing = function(id, cb) {
  Address.get(id, function(err, address) {
    db.query(sql_map_to_listing, [id], function(err, res) {
      if(err)
        return cb(err);

      if(res.rows.length > 0)
        return cb(null, res.rows[0].id)
      else
        return cb(null, null);
    });
  });
}

Address.reschedule = function(id, cb) {
  Address.mapToListing(id, function(err, listing_id) {
    if(!listing_id)
      return cb(null, null);
    else
      return Recommendation.generateForListing(listing_id, cb);
  });
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
            return Address.updateLatLong(id, location, {
              formatted_address: '',
              source: 'OSM',
              partial: false,
              confidence: 'NA',
              approximate: true
            }, cb);
          } else {
            console.log('(OSM) WARNING[1]: Error geocoding an address with id:', id);
            return cb(null, false);
          }
        } catch (e) {
          console.log('(OSM) WARNING[2]: Error geocoding an address with id:', id);
          return cb(null, false);
        }
      } else {
        console.log('(OSM) WARNING[3]: Error geocoding an address with id:', id);
        return cb(null, false);
      }
    });
  });
}

Address.isAccurate = function(address, formated) {
  var sp_c = formated.split(',');
  sp_c = sp_c.map(function(r) {
         return r.trim();
       });

  var sp_q = [];
  sp_q[0] = address.street_number + ' ' + address.street_name;
  sp_q[1] = address.city;
  sp_q[2] = address.state_code + ' ' + address.postal_code;
  sp_q[3] = address.country_code;

  var accurate = true;
  for (var i in sp_q) {
    if (!sp_c[i] || !sp_q[i]) {
      accurate = false;
      break;
    } else {
      accurate = accurate && ((sp_c[i].toLowerCase().indexOf(sp_q[i].toLowerCase())) > -1 ? true : false);
    }
  }

  return accurate;
}

Address.updateGeoFromGoogleDirect = function(id, cb) {
  Address.get(id, function(err, address) {
    if(err)
      return cb(err);

    var standard = Address.getGoogleGeocodingSearchStringDirect(address);
    request(config.google.url +  '?address=' + qs.escape(standard), function(err, response, body) {
      if(err)
        return cb(err);

      if(body) {
        try {
          body = JSON.parse(body);

          if(body.status === 'OK') {
            if(body.results[0]) {
              var location = {};
              location.latitude = body.results[0].geometry.location.lat;
              location.longitude = body.results[0].geometry.location.lng;
              var partial = body.results[0].partial_match;
              var confidence = body.results[0].geometry.location_type;
              var formatted_address = body.results[0].formatted_address;
              var approximate = (confidence === 'APPROXIMATE') ? true : false;

              console.log('(Google-Direct) NOTICE: UPDATING LAT/LONG for address with id:', id, '(', standard, ') location:', location, 'confidence:', confidence);
              Address.updateLatLong(id, location, {
                formatted_address: formatted_address,
                source: 'Google',
                partial: partial,
                confidence: confidence,
                approximate: approximate
              }, function(err, address) {
                   if(err)
                     return cb(err);

                   return cb(null, address.id);
                 });
            } else {
              console.log('(Google-Direct) WARNING[1]: Error geocoding an address with id:', id);
              return cb(null, false);
            }
          } else {
            console.log('(Google-Direct) WARNING[2]: Error geocoding an address with id:', id);
            return cb(null, false);
          }
        }
        catch (e) {
          console.log('(Google-Direct) WARNING[3]: Error geocoding an address with id:', id);
          return cb(null, false);
        }
      } else {
        console.log('(Google-Direct) WARNING[4]: Error geocoding an address with id:', id);
        return cb(null, false);
      }
    });
  });
}

Address.updateGeoFromBingDirect = function(id, cb) {
  Address.get(id, function(err, address) {
    if(err)
      return cb(err);

    var standard = Address.getGoogleGeocodingSearchStringDirect(address);
    request(config.bing.url + '?q=' + qs.escape(standard) + '&key=' + config.bing.api_key, function(err, response, body) {
      if(err)
        return cb(err);

      if(body) {
        try {
          body = JSON.parse(body);
          if(body.statusCode == 200) {
            if(body.resourceSets[0]) {
              if(body.resourceSets[0].resources) {
                if(body.resourceSets[0].resources[0]) {
                  var location = {};
                  location.latitude = body.resourceSets[0].resources[0].point.coordinates[0];
                  location.longitude = body.resourceSets[0].resources[0].point.coordinates[1];
                  var partial = false; // Not Available
                  var confidence = body.sourceSets[0].resources[0].confidence;
                  var formatted_address = body.resourceSets[0].resources[0].address.formattedAddress;
                  var approximate = (confidence === 'High') ? false : true;

                  console.log('(Bing-Direct) NOTICE: UPDATING LAT/LONG for address with id:', id, '(', standard, ') location:', location, 'confidence:', confidence);
                  Address.updateLatLong(id, location, {
                    formatted_address: formatted_address,
                    source: 'Bing',
                    partial: partial,
                    confidence: confidence,
                    approximate: approximate
                  }, function(err, address) {
                       if(err)
                         return cb(err);

                       return cb(null, address.id);
                     });
                } else {
                  console.log('(Bing-Direct) WARNING[6]: Error geocoding an address with id:', id);
                  return cb(null, false);
                }
              } else {
                console.log('(Bing-Direct) WARNING[5]: Error geocoding an address with id:', id);
                return cb(null, false);
              }
            } else {
              console.log('(Bing-Direct) WARNING[1]: Error geocoding an address with id:', id);
              return cb(null, false);
            }
          } else {
            console.log('(Bing-Direct) WARNING[2]: Error geocoding an address with id:', id);
            return cb(null, false);
          }
        }
        catch (e) {
          console.log('(Bing-Direct) WARNING[3]: Error geocoding an address with id:', id);
          return cb(null, false);
        }
      } else {
        console.log('(Google-Direct) WARNING[4]: Error geocoding an address with id:', id);
        return cb(null, false);
      }
    });
  });
}

Address.updateGeoFromGoogle = function(id, cb) {
  Address.get(id, function(err, address) {
    if(err)
      return cb(null, false);

    gm.geocode({address: Address.getGoogleGeocodingSearchString(address)}, function(err, data) {
      if(err)
        return cb(err);

      if (!data)
        return cb(null, 'No data received for address with id: ' + id);

      if (data.status === 'OK') {
        var location = {};

        location.latitude = data.results[0].geometry.location.lat;
        location.longitude = data.results[0].geometry.location.lng;
        var partial = false; // Not Available
        var confidence = body.sourceSets[0].resources[0].confidence;
        var formatted_address = body.resourceSets[0].resources[0].address.formattedAddress;
        var approximate = (confidence === 'High') ? false : true;

        console.log('(Google) NOTICE: UPDATING LAT/LONG for address with id:', id, 'location:', location);
        Address.updateLatLong(id, location, {
          formatted_address: formatted_address,
          source: 'Google',
          partial: partial,
          confidence: confidence,
          approximate: approximate
        }, function(err, res) {
          if(err)
            return cb(err);

          return cb(null, id);
        });
      } else {
        console.log('(Google) Warning: Error geocoding an address with id:', id);
        return cb(null, false);
      }
    });
  });
}

Address.updateLatLong = function(id, location, aux, cb) {
  Address.get(id, function(err, data) {
    if(err)
      return cb(err);

    db.query(sql_update_latlong, [location.longitude,
                                  location.latitude,
                                  aux.source,
                                  aux.partial,
                                  aux.formatted_address,
                                  aux.source + '_' + aux.confidence,
                                  aux.approximate,
                                  id
                                 ],
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

Address.getBatchOfAddressesWithoutLatLongGoogle = function(limit, cb) {
  db.query(sql_batch_latlong_google, [limit], function(err, res) {
    if(err)
      return cb(err);

    var address_ids = res.rows.map(function(r) {
                        return r.id;
                      });

    return cb(null, address_ids);
  });
}

Address.getBatchOfAddressesWithoutLatLongBing = function(limit, cb) {
  db.query(sql_batch_latlong_bing, [limit], function(err, res) {
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