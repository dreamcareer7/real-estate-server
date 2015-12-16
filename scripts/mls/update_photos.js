require('../connection.js');

var async = require('async');
var error = require('../../lib/models/Error.js');
var config = require('../../lib/config.js');
var _u = require('underscore');
var util = require('util');
var sleep = require('sleep');
var colors = require('colors');

require('../../lib/models/Address.js');
require('../../lib/models/Property.js');
require('../../lib/models/Listing.js');
require('../../lib/models/Recommendation.js');
require('../../lib/models/Room.js');
require('../../lib/models/User.js');
require('../../lib/models/S3.js');

var retsLoginUrl = config.ntreis.login_url;
var retsUser = config.ntreis.user;
var retsPassword = config.ntreis.password;

var client = require('rets-client').getClient(retsLoginUrl, retsUser, retsPassword);

client.once('connection.success', function() {
  Listing.getBatchOfListingsRequirePhotoUpdate(config.ntreis.photo_update_batch_size, function(err, listing_muis) {
    console.log('updating photos for:', listing_muis);
    if(err) {
      console.log(err);
      process.exit(1);
    }

    var startTime = (new Date()).getTime();
    async.mapLimit(listing_muis,
                   config.ntreis.concurrency,
                   function(r, cb) {
                     sleep.usleep(config.ntreis.staging);
                     Listing.getByMUI(r, function(err, listing) {
                       if(err)
                         return cb(err);

                       Listing.fetchPhotos(r, client, config, function(err, links) {
                         if(err)
                           return cb(err);

                         var cover = links[0] || '';
                         links = links.splice(1);
                         var gallery = '{' + links.join(',') + '}';
                         console.log('UPDATING photos for listing with MUI:'.cyan, r, 'gallery:'.yellow, gallery, 'cover:'.green, cover, 'photo_count:'.blue, links.length);
                         return Listing.updateCoverAndGallery(r, cover, gallery, links.length, cb);
                       });
                     });
                   },
                   function(err, results) {
                     if(err) {
                       console.log(err);
                       sleep.usleep(config.ntreis.staging);
                       return;
                     }

                     var endTime = (new Date()).getTime();
                     var elapsed = (endTime - startTime) / 1000;
                     var remaining = parseInt(config.ntreis.pause - elapsed);

                     if (remaining > 0) {
                       console.log('Pausing for'.yellow,
                                   remaining,
                                   'seconds before termination to meet NTREIS limit...'.yellow);
                       sleep.sleep(remaining);
                       process.exit(0);
                     } else {
                       process.exit(0);
                     }
                   });
  });
});