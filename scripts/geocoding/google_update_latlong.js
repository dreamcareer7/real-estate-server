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
require('../../lib/models/Shortlist.js');
require('../../lib/models/User.js');
require('../../lib/models/MessageRoom.js');


Address.getBatchOfAddressesWithoutLatLong(config.google.address_batch_size, function(err, address_ids) {
  if(err) {
    console.log(err);
    process.exit(1);
  }

  var startTime = (new Date()).getTime();
  async.mapLimit(address_ids,
                 config.google.concurrency,
                 function(r, cb) {
                   sleep.sleep(1);
                   return Address.updateGeoFromGoogleDirect(r, cb);
                 },
                 function(err, results) {
                   if(err) {
                     console.log(err);
                     sleep.sleep(1);
                     return;
                   }

                   var endTime = (new Date()).getTime();
                   var elapsed = (endTime - startTime) / 1000;
                   var remaining = parseInt(config.google.pause - elapsed);

                   results = results.filter(Boolean);
                   async.map(results, Address.reschedule, function(err, ok) {
                     if(err)
                       return;

                     if (remaining > 0) {
                       console.log('Pausing for'.yellow,
                                   remaining,
                                   'seconds before termination to meet Google\'s limit on daily requests...'.yellow);
                       sleep.sleep(remaining);
                     }

                     return;
                   });
                 });
});
