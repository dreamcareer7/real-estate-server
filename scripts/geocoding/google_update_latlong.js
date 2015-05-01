var async = require('async');
var db = require('../../lib/utils/db.js');
var error = require('../../lib/models/Error.js');
var config = require('../../lib/config.js');
var _u = require('underscore');
var util = require('util');
var sleep = require('sleep');
var dayLimit = 0;

require('../../lib/models/Address.js');

Address.getBatchOfAddressesWithoutLatLong(4, function(err, address_ids) {
  if(err) {
    console.log(err);
    process.exit(1);
  }

  console.log(address_ids);
  async.mapSeries(address_ids,
                  function(r, cb) {
                    return Address.updateGeoFromGoogle(r, cb);
                  },
                  function(err, results) {
                    if(err) {
                      console.log(err);
                      sleep.sleep(1);
                      return;
                    }

                    console.log(results);
                    sleep.sleep(1);
                    return;
                  });
});
