var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async = require('async');
var sql = require('../utils/require_sql.js');
var numeral = require('numeral');

Listing = {};
CompactListing = {};

var schema = {
  type: 'object',
  properties: {
    property_id: {
      type: 'string',
      required: true,
      uuid: true
    },

    listing_agent_id: {
      type: 'string',
      required: false,
      uuid: true
    },

    listing_agency_id: {
      type: 'string',
      required: false,
      uuid: true
    },

    altering_agent: {
      type: 'string',
      required: false,
      uuid: true
    },

    status: {
      type: 'string',
      required: 'true',
      enum: ['Active', 'Sold', 'Pending',
             'Temp Off Market', 'Leased', 'Active Option Contract',
             'Active Contingent', 'Active Kick Out', 'Withdrawn',
             'Expired', 'Cancelled', 'Withdrawn Sublisting',
             'Incomplete', 'Incoming']
    },

    matrix_unique_id: {
      type: 'string',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Listing object
var sql_insert = require('../sql/listing/insert.sql');
var sql_update = require('../sql/listing/update.sql');
var sql_get = require('../sql/listing/get.sql');
var sql_get_compacts = require('../sql/listing/get_compacts.sql');
var sql_get_mui = require('../sql/listing/get_mui.sql');
var sql_get_mls_number = require('../sql/listing/get_mls_number.sql');
var sql_delete = require('../sql/listing/delete.sql');
var sql_matching = require('../sql/listing/matching.sql');
var sql_interested = require('../sql/listing/interested.sql');
var sql_batch_photo_update = require('../sql/listing/batch_photo_update.sql');
var sql_update_cover_gallery = require('../sql/listing/update_cover_gallery.sql');

function insert(listing, cb) {
  db.query(sql_insert, [
    listing.property_id,
    listing.alerting_agent_id,
    listing.listing_agent_id,
    listing.listing_agency_id,
    listing.currency,
    listing.price,
    listing.status,
    listing.matrix_unique_id,
    listing.original_price,
    listing.last_price,
    listing.low_price,
    listing.association_fee,
    listing.association_fee_frequency,
    listing.association_fee_includes,
    listing.association_type,
    listing.mls_number,
    listing.unexempt_taxes,
    listing.gallery_images,
    listing.cover,
    listing.financing_proposed,
    listing.list_office_mui,
    listing.list_office_mls_id,
    listing.list_office_name,
    listing.list_office_phone,
    listing.co_list_office_mui,
    listing.co_list_office_mls_id,
    listing.co_list_office_name,
    listing.co_list_office_phone,
    listing.selling_office_mui,
    listing.selling_office_mls_id,
    listing.selling_office_name,
    listing.selling_office_phone,
    listing.co_selling_office_mui,
    listing.co_selling_office_mls_id,
    listing.co_selling_office_name,
    listing.co_selling_office_phone,
    listing.list_agent_mui,
    listing.list_agent_direct_work_phone,
    listing.list_agent_email,
    listing.list_agent_full_name,
    listing.list_agent_mls_id,
    listing.co_list_agent_mui,
    listing.co_list_agent_direct_work_phone,
    listing.co_list_agent_email,
    listing.co_list_agent_full_name,
    listing.co_list_agent_mls_id,
    listing.selling_agent_mui,
    listing.selling_agent_direct_work_phone,
    listing.selling_agent_email,
    listing.selling_agent_full_name,
    listing.selling_agent_mls_id,
    listing.co_selling_agent_mui,
    listing.co_selling_agent_direct_work_phone,
    listing.co_selling_agent_email,
    listing.co_selling_agent_full_name,
    listing.co_selling_agent_mls_id,
    listing.listing_agreement,
    listing.possession,
    listing.capitalization_rate,
    listing.compensation_paid,
    listing.date_available,
    listing.last_status,
    listing.mls_area_major,
    listing.mls_area_minor,
    listing.mls,
    listing.move_in_date,
    listing.permit_address_internet_yn,
    listing.permit_comments_reviews_yn,
    listing.permit_internet_yn,
    listing.price_change_timestamp,
    listing.matrix_modified_dt,
    listing.property_association_fees,
    listing.showing_instructions_type,
    listing.special_notes,
    listing.tax_legal_description,
    listing.total_annual_expenses_include,
    listing.transaction_type,
    listing.virtual_tour_url_branded,
    listing.virtual_tour_url_unbranded,
    listing.active_option_contract_date,
    listing.keybox_type,
    listing.keybox_number,
    listing.close_date,
    listing.back_on_market_date,
    listing.deposit_amount,
    listing.photo_count,
    listing.dom,
    listing.cdrom
  ], function(err, res) {
       if(err) {
         return cb(err)
       }

       return cb(null, res.rows[0].id)
     });
}

Listing.get = function(id, cb) {
  var res_property;
  var res_final;

  db.query(sql_get, [id], function(err, res_base) {
    if(err)
      return cb(err);

    if(res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Listing not found'));

    var listing = res_base.rows[0];

    Property.get(listing.property_id, function(err, property) {
      if (err)
        return cb(err);

      async.parallel({
        alerting_agent: function(cb) {
          if (!listing.alerting_agent)
            return cb();

          User.get(listing.alerting_agent_id, cb);
        },
        listing_agent: function(cb) {
          if (!listing.listing_agent_id)
            return cb();

          User.get(listing.listing_agent_id, cb);
        },
        listing_agency: function(cb) {
          if (!listing.listing_agency_id)
            return cb();

          Agency.get(listing.listing_agency_id, cb);
        }
      }, function(err, results) {
           var res_final = listing;

           res_final.property = property;
           res_final.alerting_agent = results.alerting_agent || null;
           res_final.listing_agent = results.listing_agent || null;
           res_final.listing_agency = results.listing_agency || null;

           return cb(null, res_final);
         });
    });
  });
}

Listing.getCompacts = function(ids, cb) {
  db.query(sql_get_compacts, [ids], (err, res) => cb(err, res.rows));
}

// FIXME: Creating a listing requires all following parameters:
// A listing data, a property data and an address data. This also
// applies to updating. It's not clear at this point how we intend
// on designing this without any knowledge of the MLS protocol.
// Ref: #1 desc
Listing.create = function(listing, cb) {
  validate(listing, function(err) {
    if(err) {
      return cb(err);
    }

    insert(listing, cb);
  });
}

Listing.update = function(id, listing, cb) {
  Listing.get(id, function(err, data) {
    if(err)
      return cb(err);

    db.query(sql_update, [listing.alerting_agent_id,
                          listing.listing_agent_id,
                          listing.listing_agency_id,
                          listing.currency,
                          listing.price,
                          listing.status,
                          listing.original_price,
                          listing.last_price,
                          listing.low_price,
                          listing.association_fee,
                          listing.association_fee_frequency,
                          listing.association_fee_includes,
                          listing.association_type,
                          listing.unexempt_taxes,
                          listing.financing_proposed,
                          listing.list_office_mui,
                          listing.list_office_mls_id,
                          listing.list_office_name,
                          listing.list_office_phone,
                          listing.co_list_office_mui,
                          listing.co_list_office_mls_id,
                          listing.co_list_office_name,
                          listing.co_list_office_phone,
                          listing.selling_office_mui,
                          listing.selling_office_mls_id,
                          listing.selling_office_name,
                          listing.selling_office_phone,
                          listing.co_selling_office_mui,
                          listing.co_selling_office_mls_id,
                          listing.co_selling_office_name,
                          listing.co_selling_office_phone,
                          listing.list_agent_mui,
                          listing.list_agent_direct_work_phone,
                          listing.list_agent_email,
                          listing.list_agent_full_name,
                          listing.list_agent_mls_id,
                          listing.co_list_agent_mui,
                          listing.co_list_agent_direct_work_phone,
                          listing.co_list_agent_email,
                          listing.co_list_agent_full_name,
                          listing.co_list_agent_mls_id,
                          listing.selling_agent_mui,
                          listing.selling_agent_direct_work_phone,
                          listing.selling_agent_email,
                          listing.selling_agent_full_name,
                          listing.selling_agent_mls_id,
                          listing.co_selling_agent_mui,
                          listing.co_selling_agent_direct_work_phone,
                          listing.co_selling_agent_email,
                          listing.co_selling_agent_full_name,
                          listing.co_selling_agent_mls_id,
                          listing.listing_agreement,
                          listing.possession,
                          listing.capitalization_rate,
                          listing.compensation_paid,
                          listing.date_available,
                          listing.last_status,
                          listing.mls_area_major,
                          listing.mls_area_minor,
                          listing.mls,
                          listing.move_in_date,
                          listing.permit_address_internet_yn,
                          listing.permit_comments_reviews_yn,
                          listing.permit_internet_yn,
                          listing.price_change_timestamp,
                          listing.matrix_modified_dt,
                          listing.property_association_fees,
                          listing.showing_instructions_type,
                          listing.special_notes,
                          listing.tax_legal_description,
                          listing.total_annual_expenses_include,
                          listing.transaction_type,
                          listing.virtual_tour_url_branded,
                          listing.virtual_tour_url_unbranded,
                          listing.active_option_contract_date,
                          listing.keybox_type,
                          listing.keybox_number,
                          listing.close_date,
                          listing.back_on_market_date,
                          listing.deposit_amount,
                          listing.photo_count,
                          listing.dom,
                          listing.cdom,
                          id],
             function(err, res) {
               if(err)
                 return cb(err);

               Listing.get(id, cb);
             });
  });
}

Listing.delete = function(id, cb) {
  db.query(sql_delete, [id], cb);
}

Listing.getByMUI = function(id, cb) {
  db.query(sql_get_mui, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Listing not found.'));

    Listing.get(res.rows[0].id, cb);
  });
}

Listing.getByMLSNumber = function(id, cb) {
  db.query(sql_get_mls_number, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Listing not found.'));

    Listing.get(res.rows[0].id, cb);
  });
}

Listing.matchingRoomsbyAlerts = function(id, cb) {
  Listing.get(id, function(err, listing) {
    if(err)
      return cb(err);

    if (!listing.property.address.location)
      return cb(null, []);

    db.query(sql_matching, [listing.price,
                            listing.property.square_meters,
                            listing.property.bedroom_count,
                            listing.property.bathroom_count,
                            listing.property.property_type,
                            '{' + listing.property.property_subtype + '}',
                            listing.property.address.location.longitude,
                            listing.property.address.location.latitude,
                            listing.property.year_built,
                            listing.property.pool_yn,
                            listing.property.lot_square_meters],
             function(err, res) {
               if(err)
                 return cb(err);

               return cb(null, res.rows);
             });
  });
}

Listing.getInterestedRooms = function(id, cb) {
  db.query(sql_interested, [id], function(err, res) {
    if(err)
      return cb(err);

    var room_ids = res.rows.map(function(r) {
                          return r.id;
                        });

    return cb(null, room_ids);
  });
}

Listing.issueChangeNotifications = function(listing_id, before, after, cb) {
  async.auto({
    listing: function(cb) {
      return Listing.get(listing_id, cb);
    },
    rooms: function(cb) {
      Listing.getInterestedRooms(listing_id, cb);
    },
    address: ['listing',
              function(cb, results) {
                var address_line = Address.getLocalized(results.listing.property.address);

                return cb(null, address_line);
              }],
    price_drop_trigger: ['listing',
                         'room',
                         function(cb, results) {
                           if(after.price != before.price) {
                             async.map(results.rooms, function(room_id, cb) {
                               Room.get(room_id, function(err, room) {
                                 if(err)
                                   return cb(err);

                                 Recommendation.mapListingOnRoom(room_id, listing_id, function(err, recommendation_id) {
                                   if(err)
                                     return cb(err);

                                   // var notification = {};
                                   // notification.action = 'PriceDropped';
                                   // notification.subject = listing_id;
                                   // notification.subject_class = 'Listing';
                                   // notification.object = room_id;
                                   // notification.object_class = 'Room';
                                   // notification.recommendation = recommendation_id;
                                   // notification.room = room_id;

                                   // console.log('Price Drop Notification:'.cyan,
                                   //             ('#' + listing.matrix_unique_id).red,
                                   //             '('.cyan, listing.id.yellow, ')'.cyan,
                                   //             'on Room with ID:'.cyan,
                                   //             room.id.yellow,
                                   //             '*'.blue, address_line, '*'.blue,
                                   //             'MLS#:'.white, listing.mls_number,
                                   //             'were:'.white, numeral(listing.last_price).format('0,0'),
                                   //             'is now:'.white, numeral(listing.price).format('0,0'));
                                   // if (!results.listing.last_price || results.listing.last_price == 0) {
                                   //   notification.message = '[New Price] #' + room.title + ': ' + address_line
                                   //                        + ' is now $' + numeral(listing.price).format('0,0');
                                   //   return Notification.issueForRoom(notification, cb);
                                   // } else {
                                   //   notification.message = '[Price Change] #' + room.title + ': ' + address_line + ' went from $'
                                   //                        + numeral(listing.last_price).format('0,0') + ' to $'
                                   //                        + numeral(listing.price).format('0,0');
                                   //   return Notification.issueForRoom(notification, cb);
                                   // }
                                   return cb();
                                 });
                               });
                             }, function(err, results) {
                                  if(err)
                                    return cb(err);

                                  return cb();
                                });
                           } else {
                             return cb();
                           }
                         }],
    status_change_trigger: ['listing',
                            'room',
                            function(cb, results) {
                              if(after.status != before.status) {
                                async.map(results.rooms, function(room_id, cb) {
                                  Room.get(room_id, function(err, room) {
                                    if(err)
                                      return cb(err);

                                    Recommendation.mapListingOnRoom(room_id, listing_id, function(err, recommendation_id) {
                                      if(err)
                                        return cb(err);

                                      // var notification = {};
                                      // notification.action = 'StatusChanged';
                                      // notification.subject = listing_id;
                                      // notification.subject_class = 'Listing';
                                      // notification.object = room_id;
                                      // notification.object_class = 'Room';
                                      // notification.message = '#' + room.title + ': ' + address_line + ' is now ' + after.status;
                                      // notification.recommendation = recommendation_id;
                                      // notification.room = room_id;

                                      // console.log('Status Change Notification:'.cyan,
                                      //             ('#' + listing.matrix_unique_id).red,
                                      //             '('.cyan, listing.id.yellow, ')'.cyan,
                                      //             'on Room with ID:'.cyan,
                                      //             room.id.yellow,
                                      //             '*'.blue, address_line, '*'.blue,
                                      //             'were:'.white, before.status, 'is now:'.white, after.status);
                                      // Notification.issueForRoom(notification, cb);
                                      return cb();
                                    });
                                  });
                                }, function(err, results) {
                                     if(err)
                                       return cb(err);

                                     return cb();
                                   });
                              } else {
                                return cb();
                              }
                            }]
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb();
     });
}

Listing.fetchPhotos = function(mui, client, config, cb) {
  client.getPhotos("Property", config.ntreis.gallery, mui, function(err, images) {
    if(err)
      return cb(null, []);

    async.map(images, function(image, cb) {
      if (typeof(image.buffer) === 'object') {
        if(image.mime.indexOf('image') != -1) {
          return S3.upload(config.buckets.listing_images, {body: image.buffer, ext: config.ntreis.default_photo_ext}, cb);
        } else {
          return cb(null, null);
        }
      } else {
        return cb(null, null);
      }
    }, function(err, links) {
         if(err)
           return cb(null, []);


         links = links.filter(Boolean);

         if (links) {
           return cb(null, links);
         } else {
           return cb(null, []);
         }
       });
  });
}

Listing.getBatchOfListingsRequirePhotoUpdate = function(limit, cb) {
  db.query(sql_batch_photo_update, [limit], function(err, res) {
    if(err)
      return cb(err);

    var listing_muis = res.rows.map(function(r) {
                         return r.matrix_unique_id;
                       });

    return cb(null, listing_muis);
  });
}

Listing.updateCoverAndGallery = function(mui, cover, gallery, photo_count, cb) {
  db.query(sql_update_cover_gallery, [cover, gallery, photo_count, mui], function(err, res) {
    if(err)
      return cb(err);

    return cb();
  });
}

Listing.publicize = function(model) {
  if (model.listing_agent) User.publicize(model.listing_agent);
  if (model.alerting_agent) User.publicize(model.alerting_agent);
  if (model.listing_agency) Agency.publicize(model.listing_agency);
  if (model.property) Property.publicize(model.property);

  delete model.property_id;
  delete model.property.address_id;
  delete model.alerting_agent_id;
  delete model.listing_agent_id;
  delete model.listing_agency_id;

  return model;
}

CompactListing.publicize = function(model) {
  if(model.total) delete model.total;

  return model;
}

module.exports = function(){};