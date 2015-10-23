require('../connection.js');

var async = require('async');
var error = require('../../lib/models/Error.js');
var config = require('../../lib/config.js');
var _u = require('underscore');
var util = require('util');
var sleep = require('sleep');
var colors = require('colors');
var dayLimit = 0;

require('../../lib/models/Address.js');
require('../../lib/models/Property.js');
require('../../lib/models/Listing.js');
require('../../lib/models/Recommendation.js');
require('../../lib/models/Room.js');
require('../../lib/models/User.js');

Address.getBatchOfAddressesWithoutLatLongBing(config.bing.address_batch_size, function(err, address_ids) {
  if(err) {
    console.log(err);
    process.exit(1);
  }

  var startTime = (new Date()).getTime();
  async.mapLimit(address_ids,
                 config.bing.concurrency,
                 function(r, cb) {
                   sleep.usleep(config.bing.staging);
                   return Address.updateGeoFromBing(r, cb);
                 },
                 function(err, results) {
                   if(err) {
                     console.log(err);
                     sleep.usleep(config.bing.staging);
                     return;
                   }

                   var endTime = (new Date()).getTime();
                   var elapsed = (endTime - startTime) / 1000;
                   var remaining = parseInt(config.bing.pause - elapsed);

                   results = results.filter(Boolean);
                   async.map(results, Address.reschedule, function(err, ok) {
                     if(err)
                       console.log('Error rescheduling addresses');

                     if (remaining > 0) {
                       console.log('Pausing for'.yellow,
                                   remaining,
                                   'seconds before termination to meet Bing\'s limit on daily requests...'.yellow);
                       sleep.sleep(remaining);
                       process.exit(0);
                     } else {
                       process.exit(0);
                     }
                   });
                 });
});