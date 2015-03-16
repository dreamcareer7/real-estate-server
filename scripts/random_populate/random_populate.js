var async = require('async');
var Chance = require('chance');
var db = require('../../lib/utils/db.js');
var error = require('../../lib/models/Error.js');

var chance = new Chance();

var property_type = [ "SingleFamilyHome", "MultiFamilyHome", "Townhome", "Condo" ]
var listing_status = [ "Open", "SalePending", "RemovedBySeller", "Sold" ]
var listing_cover = [ "cover.jpg", "cover1.jpg", "cover2.jpg" ]
var app_base_listings = "http://api.shortlisted.co:8088/listings/"

var sql_insert_address = "INSERT INTO addresses(\
 title, subtitle, street_number,\
 street_name, city, state,\
 state_code, postal_code, neighborhood,\
 street_prefix, unit_number, country,\
 country_code, location)\
 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, ST_SetSRID(ST_MakePoint($14, $15), 4326)) RETURNING id";

var sql_insert_property = "INSERT INTO properties(\
 bedroom_count, bathroom_count, address_id,\
 description, square_meters, property_type)\
 VALUES($1, $2, $3, $4, $5, $6) RETURNING id";

var sql_insert_listing = "WITH\
 alerting_agent AS (SELECT id FROM users WHERE type = 'agent' ORDER BY RANDOM() LIMIT 1),\
 listing_agent  AS (SELECT id FROM users WHERE type = 'agent' ORDER BY RANDOM() LIMIT 1),\
 listing_agency AS (SELECT id FROM agencies ORDER BY RANDOM() LIMIT 1)\
 INSERT INTO listings(\
 property_id, cover_image_url, currency,\
 price, status, alerting_agent_id, listing_agent_id, listing_agency_id,\
 gallery_image_urls)\
 VALUES($1, $2, $3, $4, $5, (SELECT id FROM alerting_agent), (SELECT id FROM listing_agent), (SELECT id FROM listing_agency),\
 ARRAY['http://api.shortlisted.co:8088/listings/cover3.jpg', 'http://api.shortlisted.co:8088/listings/cover4.jpg',\
 'http://api.shortlisted.co:8088/listings/cover5.jpg', 'http://api.shortlisted.co:8088/listings/cover6.jpg',\
 'http://api.shortlisted.co:8088/listings/cover7.jpg']) RETURNING id";

var sql_all_shortlist_users = "SELECT\
 shortlists_users.user AS id\
 FROM shortlists_users\
 WHERE shortlist = $1";

var sql_all_shortlists = "SELECT\
 id \
 FROM shortlists";

var sql_create_comment_room = "INSERT INTO message_rooms(listing, shortlist, message_room_type)\
 VALUES($1, $2, $3) RETURNING id";

var sql_add_user_to_comment_room = "INSERT INTO message_rooms_users(message_room, \"user\")\
 VALUES($1, $2)";

var sql_rec_to = "INSERT INTO recommendations(\
 source, source_url, referring_user,\
 referred_shortlist, object, recommendation_type, message_room)\
 VALUES('RCRRE', 'http://shortlisted.com', $1, $2, $3, 'Listing', $4)";

function random_address(cb) {
  var cords = chance.coordinates().split(",").map(parseFloat);
  db.query(sql_insert_address, [ chance.word(), // title
                                 chance.word(), // subtitle
                                 chance.integer({min: 7, max: 299}), // street_number
                                 chance.street(), // street_name
                                 chance.city(), // city
                                 chance.state({full: true}), // state
                                 chance.state(), // state_code
                                 chance.postal(), // postal
                                 chance.address(), // neighborhood
                                 chance.word(), // street_prefix
                                 chance.integer({min: 1, max: 100}), // unit_number
                                 'United States', // country
                                 'USA', // country code
                                 cords[0], // latitude
                                 cords[1] // longitude
                               ],
           function(err, res) {
             if (err)
               return cb(err);

             return cb(null, res.rows[0].id);
           });
}

function random_property(cb) {
  random_address(function(err, address_id) {
    if (err)
      return cb(err);

    db.query(sql_insert_property, [ chance.integer({min: 1, max: 5}), // bedroom_count
                                    chance.integer({min: 1, max: 3}), // bathroom_count
                                    address_id, // address_id
                                    chance.sentence({word: 5}), // description
                                    chance.integer({min: 40, max: 575}), // square_meters
                                    property_type[chance.integer({min:0, max:3})] ],
             function(err, res) {
               if (err)
                 return cb(err);

               return cb(null, res.rows[0].id);
             });
  });
}

function random_listing(cb) {
  random_property(function(err, property_id) {
    if (err)
      return cb(err);

    db.query(sql_insert_listing, [ property_id, // property_id
                                   app_base_listings + listing_cover[chance.integer({min:0, max: 2})], // cover_image_url
                                   'USD', // currency
                                   chance.integer({min: 100000, max: 1000000}), // price
                                   listing_status[chance.integer({min:0, max: 3})] ],
             function(err, res) {
               if (err)
                 return cb(err);

               return cb(null, res.rows[0].id);
             });
  });
}

function make_recommendation_to_user_on_shortlist(user, shortlist, listing, message_room, cb) {
  db.query(sql_rec_to, [user, shortlist, listing, message_room], function(err, res) {
    if (err)
      return cb(err);

    return cb(null);
  });
}

function recommend_to_all_users(cb) {
  random_listing(function(err, listing_id) {
    if (err)
      return cb(err);

    db.query(sql_all_shortlists, [], function(err, res) {
      if(err) {
        return cb(err);
      }

      async.map(res.rows,
                function(target_shortlist, cb) {
                  var message_room_id;
                  db.query(sql_create_comment_room, [listing_id, target_shortlist.id, 'Comment'], function(err, res) {
                    if(err) {
                      return cb(err);
                    }

                    message_room_id = res.rows[0].id;

                    db.query(sql_all_shortlist_users, [target_shortlist.id], function(err, res) {
                      if (err) {
                        return cb(err);
                      }

                      async.map(res.rows,
                                function(target_user, cb) {
                                  db.query(sql_add_user_to_comment_room, [message_room_id, target_user.id], function(err, res) {
                                    if(err) {
                                      console.log('msroom_id:', message_room_id, 'target_user:', target_user.id);
                                      return cb(err);
                                    }
                                  });

                                return make_recommendation_to_user_on_shortlist(target_user.id, target_shortlist.id, listing_id, message_room_id, cb);
                              },
                              function(err, done) {
                                cb(null, 'Done');
                              });
                    });
                  });
                });
    });
  });
}

recommend_to_all_users(function(err, res) {
  console.log(res);
});
