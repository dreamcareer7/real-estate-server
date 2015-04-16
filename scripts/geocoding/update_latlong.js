var async = require('async');
var db = require('../../lib/utils/db.js');
var error = require('../../lib/models/Error.js');
var config = require('../../lib/config.js');
var fs = require('fs');
var sleep = require('sleep');
var _u = require('underscore');
var gm = require('googlemaps');
var util = require('util');

require('../../lib/models/Address.js');

function updateAddress(id, cb) {
  console.log('Running for id:', id);
  sleep.usleep(200000);

  Address.get(id, function(err, address) {
    if(err)
      return cb(err);

    var standard = address.street_number + ' ' + address.street_name + ', ' + address.city + ', ' + address.state_code
    console.log('querying:', standard);
    gm.geocode(standard, function(err, data) {
      console.log('DEBUG:', JSON.stringify(data));
      if (!data)
        return cb(null, 'No data received for address with id: ' + id);

      if (data.status === 'OK') {
        var location = {};

        location.latitude = data.results[0].geometry.location.lat;
        location.longitude = data.results[0].geometry.location.lng;
        Address.updateLatLong(id, location, function(err, res) {
          if(err)
            return cb(err);

          console.log('UPDATED LAT/LONG of an address with id:', id);
          return cb(null, 'Success');
        });
      } else {
        return cb(null, 'Error geocoding an address with id:', id);
      }
    });
  });
}

Address.getBatchOfAddressesWithoutLatLong(3, function(err, address_ids) {
  if(err) {
    console.log(err);
    process.exit(1);
  }

  console.log(address_ids);
  async.mapSeries(address_ids, updateAddress, function(err, results) {
    if(err) {
      console.log(err);
      return;
    }

    console.log(results);
    return;
  });
});
