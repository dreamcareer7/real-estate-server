#!/usr/bin/env node

var async = require('async');
var db = require('../../lib/utils/db.js');
var error = require('../../lib/models/Error.js');
var config = require('../../lib/config.js');
var fs = require('fs');
var sleep = require('sleep');
var _u = require('underscore');
var program = require('commander');
var colors = require('colors');
var request = require('request');

var updatedAddresses = 0;
var updatedProperties = 0;
var updatedListings = 0;
var createdAddresses = 0;
var createdProperties = 0;
var createdListings = 0;
var geocodedAddresses = 0;
var totalItems = 0;
var itemsStart = '';
var itemsEnd = '';

var payload = {
  channel: '#ntreis-updates',
  username: config.slack.this,
  icon_emoji: ':house:'
}

var headers = {
  'User-Agent': 'Super Agent/0.0.1',
  'Content-Type': 'application/x-www-form-urlencoded'
}

var options = {
  url: config.slack.webhook,
  method: 'POST',
  headers: headers,
  form: {
  }
}

program.version(config.ntreis.version)
.option('-d, --enable-recs', 'Disable recommending listings to matching alerts: fetches data only')
.option('-p, --enable-photo-fetch', 'Disable fetching photos of properties')
.option('-r, --enable-cf-links', 'Disable displaying of CloudFront links')
.option('-l, --limit', 'Limit RETS server response manually (default: 100)', parseInt)
.parse(process.argv);

require('../../lib/models/Address.js');
require('../../lib/models/Property.js');
require('../../lib/models/Listing.js');
require('../../lib/models/Shortlist.js');
require('../../lib/models/User.js');
require('../../lib/models/MessageRoom.js');
require('../../lib/models/Recommendation.js');
require('../../lib/models/S3.js');

var retsLoginUrl = config.ntreis.login_url;
var retsUser = config.ntreis.user;
var retsPassword = config.ntreis.password;

var client = require('rets-client').getClient(retsLoginUrl, retsUser, retsPassword);
var timing = JSON.parse(fs.readFileSync('./timing.config.js', 'utf8'));

Date.prototype.toNTREISString = function() {
  return this.toISOString().replace('Z', '+');
}

function init() {
  if (!program.limit) program.limit = config.ntreis.default_limit;
  notice();
}

function notice() {
  console.log('NTREIS connector'.cyan, config.ntreis.version.cyan);
  console.log('Runtime arguments:');
  console.log('Instant Recommendation:'.yellow, (program.enableRecs) ? 'yes'.green : 'no'.red);
  console.log('Photo Fetching:'.yellow, (program.enablePhotoFetch) ? 'yes'.green : 'no'.red);
  console.log('Show CloudFront Links:'.yellow, (program.enableCfLinks) ? 'yes'.green : 'no'.red);
  console.log('Manual RETS Response Limit:'.yellow, program.limit);
}

function applyTimeDelta(dt) {
  var dt_ = new Date(dt);
  var lapsed = new Date(dt_.getTime() + 100);

  return lapsed.toNTREISString();
}

function byMatrixModifiedDT(a, b) {
  var a_ = new Date(a.MatrixModifiedDT);
  var b_ = new Date(b.MatrixModifiedDT);

  if(a_ > b_)
    return 1;
  else if(b_ > a_)
    return -1;
  else
    return 0;
}

function createObjects(data, cb) {
  var address = {};
  var property = {};
  var listing = {};

  address.title = '';
  address.subtitle = '';
  address.street_name = data.StreetName.trim();
  address.city = data.City.trim();
  address.state = 'Texas';
  address.state_code = data.StateOrProvince.trim();
  address.postal_code = data.PostalCode.trim();
  address.neighborhood = '';
  address.street_suffix = data.StreetSuffix.trim();
  address.street_number = data.StreetNumber.trim();
  address.unit_number = data.UnitNumber.trim();
  address.country = 'United States';
  address.country_code = 'USA';
  address.matrix_unique_id = data.Matrix_Unique_ID;

  property.bedroom_count = parseInt(data.BedsTotal) || 0;
  property.bathroom_count = parseFloat(data.BathsTotal) || 0.0;
  property.half_bathroom_count = parseFloat(data.BathsHalf) || 0.0;
  property.full_bathroom_count = parseFloat(data.BathsFull) || 0.0;
  property.description = data.PublicRemarks.trim();
  property.square_meters = (parseFloat(data.SqFtTotal) || 0.0 ) / 10.764;
  property.lot_square_meters = (parseFloat(data.LotSizeAreaSQFT) || 0.0) / 10.764;
  property.property_type = data.PropertyType.trim();
  property.property_subtype = data.PropertySubType.trim();
  property.matrix_unique_id = parseInt(data.Matrix_Unique_ID);
  property.year_build = parseInt(data.YearBuilt) || 0;
  property.parking_spaces_covered_total = parseFloat(data.ParkingSpacesCoveredTotal) || 0.0;
  property.heating = '{' + data.Heating + '}';

  // Property Features
  property.accessibility_features = '{' + data.AccessibilityFeatures + '}';
  property.bedroom_bathroom_features = '{' + data.BedroomBathroomFeatures + '}';
  property.commercial_features = '{' + data.CommercialFeatures + '}';
  property.community_features = '{' + data.CommunityFeatures + '}';
  property.energysaving_features = '{' + data.EnergySavingFeatures + '}';
  property.exterior_features = '{' + data.ExteriorFeatures + '}';
  property.interior_features = '{' + data.InteriorFeatures + '}';
  property.farmranch_features = '{' + data.FarmRanchFeatures + '}';
  property.fireplace_features = '{' + data.FireplaceFeatures + '}';
  property.lot_features = '{' + data.LotFeatures + '}';
  property.parking_features = '{' + data.ParkingFeatures + '}';
  property.pool_features = '{' + data.PoolFeatures + '}';
  property.security_features = '{' + data.SecurityFeatures + '}';

  listing.currency = 'USD';
  listing.price = parseFloat(data.ListPrice) || 0.0;
  listing.status = data.Status.trim();
  listing.matrix_unique_id = parseInt(data.Matrix_Unique_ID);
  listing.last_price = parseFloat(data.LastListPrice) || 0.0;
  listing.low_price = parseFloat(data.ListPriceLow) || 0.0;
  listing.original_price = parseFloat(data.OriginalListPrice) || 0.0;
  listing.association_fee = parseFloat(data.AssociationFee) || 0.0;
  listing.association_fee_frequency = data.AssociationFeeFrequency;
  listing.association_fee_includes = data.AssociationFeeIncludes;
  listing.association_type = data.AssociationType;
  listing.mls_number = data.MLSNumber;
  listing.unexempt_taxes = parseFloat(data.UnexemptTaxes) || 0.0;


  async.waterfall([
    function(cb) {
      Address.getByMUI(data.Matrix_Unique_ID, function(err, current) {
        if (err) {
          if (err.code == 'ResourceNotFound') {
            console.log('CREATED an ADDRESS'.green);
            Address.create(address, function(err, address_id) {
              if(err)
                return cb(err);

              createdAddresses++;
              Address.updateGeoFromOSM(address_id, function(err, result) {
                console.log('updating GEO information on address with id:', address_id);
                if(err)
                  return cb(err);

                if (result)
                  geocodedAddresses++;
                return cb(null, address_id);
              });
            });
          }
          else {
            return cb(err);
          }
        } else {
          Address.update(current.id, address, function(err, next) {
            if(err)
              return cb(err);

            updatedAddresses++;
            console.log('UPDATED an ADDRESS'.yellow);
            return cb(null, next.id);
          });
        }
      });
    },
    function(address_id, cb) {
      property.address_id = address_id;

      Property.getByMUI(data.Matrix_Unique_ID, function(err, current) {
        if(err) {
          if(err.code == 'ResourceNotFound') {
            console.log('CREATED a PROPERTY'.green);
            createdProperties++;
            return Property.create(property, cb);
          }

          return cb(err);
        }

        Property.update(current.id, property, function(err, next) {
          if(err)
            return cb(err);

          updatedProperties++;
          console.log('UPDATED a PROPERTY'.yellow);
          return cb(null, next.id);
        });
      });
    },
    function(property_id, cb) {
      listing.property_id = property_id;

      Listing.getByMUI(data.Matrix_Unique_ID, function(err, current) {
        if (err) {
          if (err.code === 'ResourceNotFound') {
            async.waterfall([
              function(cb) {
                if (!program.enablePhotoFetch)
                  return cb(null, []);

                client.getPhotos("Property", config.ntreis.gallery, data.Matrix_Unique_ID, function(err, images) {
                  if (err)
                    return cb(null, []);

                  async.map(images, function(image, cb) {
                    if (typeof(image.buffer) === 'object')
                      return S3.upload(config.buckets.listing_images, image.buffer, config.ntreis.default_photo_ext, cb);

                    return cb(null, null);
                  }, function(err, links) {
                       if(err)
                         return cb(null, []);

                       return cb(null, links);
                     });
                });
              },
              function(links, cb) {
                links = links.filter(Boolean);
                listing.cover = links[0] || '';

                // If array length is greater than 2, we shuffle everything except the first element which is always our cover
                // This fixes issue #17 and is caused by duplicate photos being returned by the NTREIS
                // We shuffle them to make duplicate images less annoying.
                // I hate this hack.
                links = (links.length > 2) ? Array.prototype.concat(links.slice(0, 1), _u.shuffle(links.slice(1))) : links;
                listing.gallery_images = "{" + links.join(',') + "}";

                if (program.enableCfLinks) console.log('CloudFront Resources:'.blue, links);
                console.log('CREATED a LISTING'.green);
                Listing.create(listing, function(err, next) {
                  if(err)
                    return cb(err);

                  createdListings++;
                  return cb(null, next);
                });
              }
            ], function(err, results) {
                 if(err)
                   return cb(err);

                 return cb(null, results);
               });
          } else {
            return cb(err);
          }
        }
        else {
          Listing.update(current.id, listing, function(err, next) {
            if(err)
              return cb(err);

            updatedListings++;
            console.log('UPDATED a LISTING'.yellow);
            return cb(null, next.id);
          });
        }
      });
    }
  ], function(err, result) {
       if(err)
         return cb(err);

       return cb(null, {address: address, listing: listing, property: property, listing_id: result});
     });
}

function fetch() {
  var startTime = (new Date()).getTime();
  async.auto({
    last_run: function(cb) {
      if (timing.last_run)
        return cb(null, timing.last_run);

      var initial = new Date(Date.now() - timing.initial * 24 * 3600 * 1000);
      return cb(null, initial.toNTREISString());
    },
    mls: ['last_run',
          function(cb, results) {
            console.log('Fetching listings with modification time after:', results.last_run.cyan);
            client.once('connection.success', function() {
              client.getTable("Property", "Listing");
              var fields;

              client.once('metadata.table.success', function(table) {
                fields = table.Fields;

                client.query("Property",
                             "Listing",
                             "(MatrixModifiedDT=" + results.last_run +")",
                             // "(Limit=5)",
                             function(err, data) {
                               if (err)
                                 return cb(err);

                               data.sort(byMatrixModifiedDT);
                               totalItems = data.length;
                               itemsStart = data[0].MatrixModifiedDT;
                               itemsEnd = data[data.length-1].MatrixModifiedDT;

                               console.log('INFO: Received'.cyan, data.length, 'entries between'.cyan,
                                           data[0].MatrixModifiedDT.yellow,
                                           '<->'.cyan,
                                           data[data.length-1].MatrixModifiedDT.yellow,
                                           'Limiting to'.cyan, program.limit);
                               var limited_data = data.slice(0, program.limit);

                               return cb(null, limited_data);
                             });
              });
            });
          }],
    objects: ['mls',
              function(cb, results) {
                async.mapLimit(results.mls, config.ntreis.parallel, createObjects, function(err, objects) {
                  if(err) {
                    return cb(err);
                  }

                  return cb(null, objects);
                });
              }],
    recs: ['objects',
           function(cb, results) {
             if(!program.enableRecs)
               return cb(null, false);

             var listing_ids = results.objects.map(function(r) {
                                 return r.listing_id;
                               });

             async.map(listing_ids, Recommendation.generateForListing, function(err, recs) {
               if(err)
                 return cb(err);

               return cb(null, recs);
             });
           }],
    update_last_run: ['mls', 'objects',
                      function(cb, results) {
                        var last_run = applyTimeDelta(results.mls[results.mls.length - 1].MatrixModifiedDT + 'Z');
                        timing.last_run = last_run;
                        fs.writeFileSync("timing.config.js", JSON.stringify(timing, null, 2));
                        return cb(null, false);
                      }
                     ]
  }, function(err, results) {
       var endTime = (new Date()).getTime();
       var elapsed = (endTime - startTime) / 1000;
       var remaining = parseInt(config.ntreis.pause - elapsed);
       payload.text = 'Fetch completed in ' + elapsed + ' seconds. Received total of ' +
         totalItems + ' items between: ' + itemsStart + ' <-> ' + itemsEnd + ' Summary: ' +
         createdListings + ' New Listings, ' + updatedListings + ' Updated Listings, ' +
         createdProperties + ' New Properties, ' + updatedProperties + ' Updated Properties, ' +
         createdAddresses + ' New Addresses, '  + updatedAddresses + ' Updated Addresses, ' +
         geocodedAddresses + ' Addresses Geocoded successfully using OSM,  ' +
         ((createdAddresses - geocodedAddresses) / createdAddresses) * 100 + '% Miss rate on OSM, ' +
         'pausing for ' + remaining + ' seconds before running the next fetch.' + ' Exit status: ' +
         ((err) ? 'FAILURE' : 'OK') + ' Error: ' + err;

       console.log('Info:'.yellow, payload.text);
       options.form.payload = JSON.stringify(payload);

       request.post(options, function(err, res, body) {
         if(err) {
           console.log('Error sending update to slack:', err);
         }
       });

       console.log('Total Running Time:', elapsed + 's');
       if(err)
         console.log('INFO: (TERM) Script terminated with error:'.red, err);
       else {
         console.log('INFO: (TERM) Script finished successfully'.green);
       }

       if (remaining > 0) {
         console.log('Pausing for'.yellow,
                     remaining,
                     'seconds before termination to meet NTREIS limit on heavy requests...'.yellow);
         sleep.sleep(remaining);
       }
     });
}

init();
fetch();
