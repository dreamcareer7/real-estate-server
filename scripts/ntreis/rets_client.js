var async = require('async');
var db = require('../../lib/utils/db.js');
var error = require('../../lib/models/Error.js');
var config = require('../../lib/config.js');
var fs = require('fs');
var sleep = require('sleep');
var _u = require('underscore');

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
var timing = JSON.parse(fs.readFileSync('timing.config.js', 'utf8'));

Date.prototype.toNTREISString = function() {
  return this.toISOString().replace('Z', '+');
}

function apply_time_delta(dt) {
  var dt_ = new Date(dt);
  var lapsed = new Date(dt_.getTime() + 100);

  return lapsed.toNTREISString();
}

function generateRecommendationsForListing(id, cb) {
  console.log('matching listing id:', id);

  Listing.get(id, function(err, listing) {
    if(err)
      return cb(err);

    Listing.matchingShortlistsbyAlerts(id, function(err, shortlists) {
      if(err)
        return cb(err);

      console.log('matched shortlists:', shortlists);

      async.map(shortlists, function(id, cb) {
        Shortlist.recommendListing(id, listing.id, function(err, results) {
          if(err)
            return cb(null, null);

          return cb(null, results);
        });
      }, function(err, recs) {
           if(err)
             return cb(err);

           recs = recs.filter(Boolean);
           return cb(null, recs);
         });
    });
  });
}

function createObjects(data, cb) {
  var address = {};
  var property = {};
  var listing = {};

  // address.location = {};

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
  // address.location.latitude = 51.507351;
  // address.location.longitude = -0.127758;
  // address.created_at
  // address.updated_at

  property.bedroom_count = parseInt(data.BedsTotal) || 0;
  property.bathroom_count = parseFloat(data.BathsTotal) || 0.0;
  property.description = data.PublicRemarks.trim();
  property.square_meters = (parseFloat(data.SqFtTotal) || 0.0 ) / 10.764;
  property.lot_square_meters = (parseFloat(data.LotSizeAreaSQFT) || 0.0) / 10.764;
  property.property_type = data.PropertyType.trim();
  property.property_subtype = data.PropertySubType.trim();
  property.matrix_unique_id = parseInt(data.Matrix_Unique_ID);
  property.year_build = parseInt(data.YearBuilt) || 0;
  property.parking_spaces = parseFloat(data.NumberOfParkingSpaces) || 0.0;

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

  // property.created_at
  // property.updated_at

  listing.currency = 'USD';
  listing.price = parseFloat(data.ListPrice) || 0.0;
  listing.status = data.Status.trim();
  listing.matrix_unique_id = parseInt(data.Matrix_Unique_ID);
  listing.last_price = parseFloat(data.LastListPrice) || 0.0;
  listing.low_price = parseFloat(data.ListPriceLow) || 0.0;
  listing.original_price = parseFloat(data.OriginalListPrice) || 0.0;
  listing.association_fee = parseFloat(data.AssociationFee) || 0.0;

  // listing.created_at
  // listing.updated_at

  async.waterfall([
    function(cb) {
      Address.getByMUI(data.Matrix_Unique_ID, function(err, current) {
        if (err) {
          if (err.code == 'ResourceNotFound') {
            console.log('CREATED an ADDRESS');
            return Address.create(address, cb);
          }

          return cb(err);
        }

        Address.update(current.id, address, function(err, next) {
          if(err)
            return cb(err);

          console.log('UPDATED an ADDRESS');
          return cb(null, next.id);
        });
      });
    },
    function(address_id, cb) {
      property.address_id = address_id;

      Property.getByMUI(data.Matrix_Unique_ID, function(err, current) {
        if(err) {
          if(err.code == 'ResourceNotFound') {
            console.log('CREATED a PROPERTY');
            return Property.create(property, cb);
          }

          return cb(err);
        }

        Property.update(current.id, property, function(err, next) {
          if(err)
            return cb(err);

          console.log('UPDATED a PROPERTY');
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
                client.getPhotos("Property", "LargePhoto", data.Matrix_Unique_ID, function(err, images) {
                  if (err)
                    return cb(null, []);

                  async.map(images, function(image, cb) {
                    if (typeof(image.buffer) === 'object')
                      return S3.upload(config.buckets.listing_images, image.buffer, '.jpg', cb);

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

                console.log('LINKS:', links);
                console.log('CREATED a LISTING');
                Listing.create(listing, function(err, next) {
                  if(err)
                    return cb(err);

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

            console.log('UPDATED a LISTING');
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

function magic() {
  async.auto({
    last_run: function(cb) {
      if (timing.last_run)
        return cb(null, timing.last_run);

      var initial = new Date(Date.now() - timing.initial * 24 * 3600 * 1000);
      return cb(null, initial.toNTREISString());
    },
    mls: ['last_run',
          function(cb, results) {
            console.log(results.last_run);
            client.once('connection.success', function() {
              client.getTable("Property", "Listing");
              var fields;

              client.once('metadata.table.success', function(table) {
                fields = table.Fields;

                client.query("Property",
                             "Listing",
                             "(MatrixModifiedDT=" + results.last_run +")",
                             // "(Limit=100)",
                             function(err, data) {
                               if (err)
                                 return cb(err);

                               data.sort(function(a, b) {
                                 var a_ = new Date(a.MatrixModifiedDT);
                                 var b_ = new Date(b.MatrixModifiedDT);

                                 if(a_ > b_)
                                   return 1;
                                 else if(b_ > a_)
                                   return -1;
                                 else
                                   return 0;
                               });

                               console.log('INFO: Received', data.length, 'entries between', data[0].MatrixModifiedDT, '<->', data[data.length-1].MatrixModifiedDT);
                               return cb(null, data);
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
             var listing_ids = results.objects.map(function(r) {
                                 return r.listing_id;
                               });

             async.map(listing_ids, generateRecommendationsForListing, function(err, recs) {
               if(err)
                 return cb(err);

               return cb(null, recs);
             });
           }],
    update_last_run: ['mls',
                      function(cb, results) {
                        var last_run = apply_time_delta(results.mls[results.mls.length - 1].MatrixModifiedDT + 'Z');
                        timing.last_run = last_run;
                        fs.writeFileSync("timing.config.js", JSON.stringify(timing, null, 2));
                        return cb(null, false);
                      }
                     ]
  }, function(err, results) {
       if(err)
         console.log('ERREXIT:', err);
       // else {
       //   // console.log(results.objects.length);
       //   // console.log(results.objects);
       //   results.mls.map(function(r) {
       //     // console.log(r.MatrixModifiedDT);
       //     // console.log(r.Status);
       //     // console.log(r.PropertySubType);
       //   });
       // }
     });
}

magic();