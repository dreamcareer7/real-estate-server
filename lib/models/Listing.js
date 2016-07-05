var db                      = require('../utils/db.js');
var validator               = require('../utils/validator.js');
var async                   = require('async');
var sql                     = require('../utils/require_sql.js');
var numeral                 = require('numeral');
var request                 = require('request');
var moment                  = require('moment');

var config                  = require('../config.js');

var html_listing_share_body = require('../html/listing/share.html');
var asc_listing_share_body  = require('../asc/listing/share.asc');

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
      type: 'number',
      required: true
    }
  }
};

var validate = validator.bind(null, schema);

// SQL queries to work with Listing object
var sql_insert         = require('../sql/listing/insert.sql');
var sql_update         = require('../sql/listing/update.sql');
var sql_get            = require('../sql/listing/get.sql');
var sql_get_compacts   = require('../sql/listing/get_compacts.sql');
var sql_get_mui        = require('../sql/listing/get_mui.sql');
var sql_get_mls_number = require('../sql/listing/get_mls_number.sql');
var sql_delete         = require('../sql/listing/delete.sql');
var sql_matching       = require('../sql/listing/matching.sql');
var sql_interested     = require('../sql/listing/interested.sql');
var sql_string_search  = require('../sql/listing/string_search.sql');
var sql_get_statuses   = require('../sql/listing/get_statuses.sql');

function insert(listing, cb) {
  db.query(sql_insert, [
    listing.property_id,
    null, // listing_agent_id and
    null, // alerting_agent_id are deprecated
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
    listing.close_price,
    listing.back_on_market_date,
    listing.deposit_amount,
    listing.dom,
    listing.cdom,
    listing.buyers_agency_commission,
    listing.sub_agency_commission,
    listing.list_date,
    listing.showing_instructions,
    listing.appointment_phone,
    listing.appointment_phone_ext,
    listing.appointment_call,
    listing.owner_name,
    listing.seller_type,
    listing.occupancy,
    listing.private_remarks
  ], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, res.rows[0].id);
  });
}

Listing.get = function(id, cb) {
  db.query(sql_get, [
    id,
    process.domain.user ? process.domain.user.id : null
  ], function(err, res_base) {
    if(err)
      return cb(err);

    if(res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Listing not found'));

    var listing = res_base.rows[0];
    cb(null, listing);
  });
};

Listing.getCompacts = function(ids, cb) {
  db.query(sql_get_compacts, [
    ids,
    process.domain.user ? process.domain.user.id : null
  ], (err, res) => {
    if(err)
      return cb(err);

    cb(null, res.rows);
  });
};

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

    return insert(listing, cb);
  });
};

Listing.update = function(id, listing, cb) {
  Listing.get(id, function(err, data) {
    if(err)
      return cb(err);

    db.query(sql_update, [
                          null, // listing_agent_id and
                          null, // alerting_agent_id are deprecated
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
                          listing.close_price,
                          listing.back_on_market_date,
                          listing.deposit_amount,
                          listing.dom,
                          listing.cdom,
                          listing.buyers_agency_commission,
                          listing.sub_agency_commission,
                          listing.list_date,
                          listing.showing_instructions,
                          listing.appointment_phone,
                          listing.appointment_phone_ext,
                          listing.appointment_call,
                          listing.owner_name,
                          listing.seller_type,
                          listing.occupancy,
                          listing.private_remarks,
                          id],
             function(err, res) {
               if(err)
                 return cb(err);

               Listing.get(id, cb);
             });
  });
};

Listing.delete = function(id, cb) {
  db.query(sql_delete, [id], cb);
};

Listing.getByMUI = function(id, cb) {
  db.query(sql_get_mui, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Listing not found.'));

    return Listing.get(res.rows[0].id, cb);
  });
};

Listing.getByMLSNumber = function(id, cb) {
  db.query(sql_get_mls_number, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Listing not found.'));

    return Listing.get(res.rows[0].id, cb);
  });
};

Listing.matchingRoomsByAlerts = function(id, cb) {
  Listing.get(id, function(err, listing) {
    if(err)
      return cb(err);

    if (!listing.property.address.location)
      return cb(null, []);

    db.query(sql_matching, [
      listing.price,
      listing.property.square_meters,
      listing.property.bedroom_count,
      listing.property.bathroom_count,
      listing.property.property_type,
      '{' + listing.property.property_subtype + '}',
      listing.property.address.location.longitude,
      listing.property.address.location.latitude,
      listing.property.year_built,
      listing.property.pool_yn,
      listing.property.lot_square_meters,
      listing.status
    ], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows);
    });
  });
};

Listing.getInterestedRooms = function(id, cb) {
  db.query(sql_interested, [id], function(err, res) {
    if(err)
      return cb(err);

    var room_ids = res.rows.map(function(r) {
                          return r.id;
                        });

    return cb(null, room_ids);
  });
};

Listing.issueChangeNotifications = function(listing_id, before, after, cb) {
  async.auto({
    listing: cb => {
      return Listing.get(listing_id, cb);
    },
    rooms: cb => {
      Listing.getInterestedRooms(listing_id, cb);
    },
    address: [
      'listing',
      (cb, results) => {
        var address_line = Address.getLocalized(results.listing.property.address);

        return cb(null, address_line);
      }
    ],
    price_drop_trigger: [
      'listing',
      'rooms',
      (cb, results) => {
        if(after.price != before.price) {
          async.map(results.rooms, (room_id, cb) => {
            Room.get(room_id, (err, room) => {
              if(err)
                return cb(err);

              Recommendation.mapListingOnRoom(room_id, listing_id, (err, recommendation_id) => {
                if(err)
                  return cb();

                var notification = {};
                notification.action = 'PriceDropped';
                notification.subject = listing_id;
                notification.subject_class = 'Listing';
                notification.object = room_id;
                notification.object_class = 'Room';
                notification.recommendation = recommendation_id;
                notification.room = room_id;

                console.log('Price Drop Notification:'.cyan,
                            ('#' + results.listing.matrix_unique_id).red,
                            '('.cyan, results.listing.id.yellow, ')'.cyan,
                            'on Room with ID:'.cyan,
                            room.id.yellow,
                            '*'.blue, results.address, '*'.blue,
                            'MLS#:'.white, results.listing.mls_number,
                            'was:'.white, Listing.priceHumanReadable(before.price),
                            'is now:'.white, Listing.priceHumanReadable(after.price));
                if (!before.price || before.price == 0) {
                  notification.message = '[New Price] #' + room.title + ': ' + results.address
                    + ' is now ' + Listing.priceHumanReadable(after.price);
                  return Notification.issueForRoom(notification, cb);
                } else {
                  notification.message = '[Price Change] #' + room.title + ': ' + results.address + ' went from '
                    + Listing.priceHumanReadable(before.price) + ' to '
                    + Listing.priceHumanReadable(after.price);
                  return Notification.issueForRoom(notification, cb);
                }
              });
            });
          }, (err, results) => {
            if(err)
              return cb(err);

            return cb();
          });
        } else {
          return cb();
        }
      }
    ],
    status_change_trigger: [
      'listing',
      'rooms',
      (cb, results) => {
        if(after.status != before.status) {
          async.map(results.rooms, (room_id, cb) => {
            Room.get(room_id, (err, room) => {
              if(err)
                return cb(err);

              Recommendation.mapListingOnRoom(room_id, listing_id, function(err, recommendation_id) {
                if(err)
                  return cb(err);

                var notification = {};
                notification.action = 'StatusChanged';
                notification.subject = listing_id;
                notification.subject_class = 'Listing';
                notification.object = room_id;
                notification.object_class = 'Room';
                notification.message = '#' + room.title + ': ' + results.address + ' is now ' + after.status;
                notification.recommendation = recommendation_id;
                notification.room = room_id;

                console.log('Status Change Notification:'.cyan,
                            ('#' + results.listing.matrix_unique_id).red,
                            '('.cyan, results.listing.id.yellow, ')'.cyan,
                            'on Room with ID:'.cyan,
                            room.id.yellow,
                            '*'.blue, results.address, '*'.blue,
                            'were:'.white, before.status, 'is now:'.white, after.status);
                Notification.issueForRoom(notification, cb);
              });
            });
          }, (err, results) => {
            if(err)
              return cb(err);

            return cb();
          });
        } else {
          return cb();
        }
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb();
  });
};

Listing.stringSearch = function(query, status, cb) {
  db.query(sql_string_search,[
    query.replace(/,/g, ' '),
    status
  ], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var listing_ids = res.rows.map(function(r) {
      return r.id;
    });

    Listing.getCompacts(listing_ids, (err, listings) => {
      return cb(err, listings);
    });
  });
};

Listing.getSimilars = (mls, cb) => {
  Listing.getByMLSNumber(mls, (err, listing) => {
    if(err)
      return cb(err);

    request(config.recommendations.url + '/recommend/' + listing.matrix_unique_id, (err, res, body) => {
      if(err)
        return cb(Error.Generic(err));

      try {
        var response = JSON.parse(body);
      } catch(e) {
        return cb(Error.Generic('Error parsing JSON response from Recommendation engine'));
      }

      if(!response.results)
        return cb(null, []);

      var getItem = (result, cb) => {
        Listing.getByMUI(result.matrix_unique_id, (err, listing) => {
          if(err)
            return cb(err);

          listing.similarity = result.similarity;
          cb(null, listing);
        });
      };

      async.map(response.results, getItem, cb);
    });
  });
};

Listing.getStatuses = function(cb) {
  db.query(sql_get_statuses, [], (err, res) => {
    if(err)
      return cb(err);

    var states = res.rows.map(row => row.state);
    return cb(null, states);
  });
};

function publicizeSensitive(l) {
  var user = process.domain.user;
  var type = user ? user.user_type : 'Guest';

  var properties = {
    sub_agency_commission:              ['Agent', 'Brokerage'],
    close_price:                        ['Agent', 'Brokerage'],
    buyers_agency_commission:           ['Agent', 'Brokerage'],
    listing_agreement:                  ['Agent', 'Brokerage'],
    list_agent_mls_id:                  ['Agent', 'Brokerage'],
    private_remarks:                    ['Agent', 'Brokerage'],
    appointment_call:                   ['Agent', 'Brokerage'],
    appointment_phone:                  ['Agent', 'Brokerage'],
    owner_name:                         ['Agent', 'Brokerage'],
    keybox_number:                      ['Agent', 'Brokerage'],
    keybox_type:                        ['Agent', 'Brokerage'],
    showing_instructions:               ['Agent', 'Brokerage'],
    occupancy:                          ['Agent', 'Brokerage'],
    seller_type:                        ['Agent', 'Brokerage'],
    list_agent_direct_work_phone:       ['Agent', 'Brokerage'],
    list_agent_email:                   ['Agent', 'Brokerage'],
    co_list_agent_direct_work_phone:    ['Agent', 'Brokerage'],
    co_list_agent_email:                ['Agent', 'Brokerage'],
    selling_agent_direct_work_phone:    ['Agent', 'Brokerage'],
    selling_agent_email:                ['Agent', 'Brokerage'],
    co_selling_agent_direct_work_phone: ['Agent', 'Brokerage'],
    co_selling_agent_email:             ['Agent', 'Brokerage'],
    list_office_phone:                  ['Agent', 'Brokerage'],
    co_list_office_phone:               ['Agent', 'Brokerage'],
    selling_office_phone:               ['Agent', 'Brokerage'],
    co_selling_office_phone:            ['Agent', 'Brokerage']
  };

  Object.keys(properties).forEach(name =>{
    var allowed = properties[name];

    if(allowed.indexOf(type) < 0)
      delete l[name];
  });
}

Listing.publicize = function(model) {
  if (model.property) Property.publicize(model.property);

  delete model.property_id;
  delete model.property.address_id;

  publicizeSensitive(model);

  return model;
};

Listing.getStatusHTMLColorCode = function(status) {
  switch(status) {
  case 'Active':
  case 'Active Contingent':
  case 'Active Kick Out':
  case 'Active Option Contract':
    return '#35b863';

  case 'Pending':
    return '#f8b619';

  case 'Leased':
  case 'Expired':
  case 'Sold':
  case 'Cancelled':
    return '#db3821';

  default:
    return '#9b9b9b';
  }
};

Listing.priceHumanReadable = function(price) {
  if(!price || typeof(price) != 'number')
    return '';

  return '$' + numeral(price).format('0,0');
};

Listing.getSquareFeet = function(square_meters) {
  if(!square_meters || typeof(square_meters) != 'number')
    return 'N/A';

  return parseInt(10.7639 * square_meters);
};

Listing.processEmail = function(job, cb) {
  var data = job.data;

  return Email.send({
    from: 'Rechat <support@' + config.email.seamless_address + '>',
    to: [ data.to ],
    source: config.email.source,
    html_body: html_listing_share_body,
    suppress_outer_template: true,
    mailgun_options: {
      'h:Reply-To': data.from,
      'h:In-Reply-To': '<invitation-room-' + data.room_id + '@rechat.com>'
    },
    message: {
      body: {
        html: {
          data: ''
        },
        text: {
          data: ''
        }
      },
      subject: {
        data: data.subject
      }
    },
    template_params: data
  }, cb);
};

Listing.processSMS = function(job, cb) {
  var data = job.data;

  if(!data.to)
    return cb();

  return SMS.send({
    from: config.twilio.from,
    to: data.to,
    body: asc_listing_share_body,
    template_params: data
  }, cb);
};

Listing.sendAsEmail = function(data, cb) {
  Listing.send('email', data, cb);
};

Listing.sendAsSMS = function(data, cb) {
  Listing.send('sms', data, cb);
};

Listing.sendAsSMSToNonUser = function(user_id, data, phone, cb) {
  async.auto({
    invite: cb => {
      return Invitation.invitePhoneNumberToNewRoom(user_id, phone, data.listing_title, cb);
    },
    archive_room: [
      'invite',
      (cb, results) => {
        return Room.archive(results.invite.room, cb);
      }
    ],
    send: [
      'invite',
      (cb, results) => {
        data.url = results.invite.url;

        return Listing.sendAsSMS(data, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.invite.room);
  });
};

Listing.send = function(transport, data, cb) {
  var i = data.listing.property.interior_features || [];
  var e = data.listing.property.exterior_features || [];

  var features = i.concat(e).filter(Boolean);
  var list_date = data.listing.list_date;
  var first_name = data.user.first_name;
  if (!first_name)
    first_name = '';

  if (first_name.indexOf('@') != -1)
    first_name = '';

  var job_data = {
    // avatar is handled by async.auto
    first_name: first_name,
    address: Address.getLocalized(data.listing.property.address),
    // FIXME
    properties: features ? features.join(', ') : 'N/A',
    listing_title: data.listing.title,
    photo_uri: data.listing.cover_image_url || 'http://assets.rechat.co/mail/house.png',
    last_price: Listing.priceHumanReadable(data.listing.last_price),
    price: Listing.priceHumanReadable(data.listing.price),
    status: data.listing.status,
    status_color: Listing.getStatusHTMLColorCode(data.listing.status),
    // FIXME
    dom: list_date ? moment.unix(list_date).fromNow() : 'N/A',
    // sender_name: Resolved by async.auto
    // listing_uri: Resolved by async.auto
    city: data.listing.property.address.city,
    state: data.listing.property.address.state_code,
    postal_code: data.listing.property.address.postal_code,
    bedroom_count: data.listing.property.bedroom_count || '',
    bathroom_count: data.listing.property.bathroom_count || '',
    square_meters: Listing.getSquareFeet(data.listing.property.square_meters) || '',
    description: data.listing.property.description || '',
    agent_details: 'Details',
    mls_terms: config.webapp.base_url + '/terms/mls',
    subject: '[Rechat] '+ (data.room.title ? data.room.title : 'New Listing'),
    url: data.url || config.webapp.base_url,
    room_id:data.room.id,
    _title: ''
  };

  var job_type = 'listing_share_' + transport;

  switch(transport) {
  case 'sms':
    job_data.to = data.user.phone_number;
    job_data.from = config.twilio.from;
    break;

  case 'email':
    job_data.to = data.user.email;
    job_data.from = data.room.id + '@' + config.email.seamless_address;
    break;
  }

  if(!job_data.to)
    return cb();

  async.auto({
    sender: cb => {
      return User.get(data.sender, (err, user) => {
        if(err)
          return cb(err);

        job_data.sender_name = user.first_name;
        job_data.sender_full_name = (user.first_name ? user.first_name : '') + ' ' + (user.last_name ? user.last_name : '');
        job_data.avatar = user.profile_image_url || 'http://assets.rechat.com/mail/avatar.png';
        job_data.agency_phone = User.getFormattedPhoneNumber(user.phone_number) || '';

        return cb();
      });
    },
    office: cb => {
      return User.getOffice(data.sender, (err, office) => {
        if(err)
          return cb(err);

        job_data.agency_name = (office) ? (office.name ? office.name : '') : '';

        return cb();
      });
    },
    branch: cb => {
      var desktop_url = config.webapp.base_url + '/dashboard/mls/' + data.listing.id;

      var b = {};
      b.listing = data.listing.id;
      b.action = 'RedirectToListing';
      b.transport = transport;
      b.to = job_data.to;
      b['$desktop_url'] = desktop_url;
      b['$fallback_url'] = desktop_url;

      Branch.createURL(b, (err, link) => {
        if(err)
          return cb(err);

        job_data.listing_uri = link;

        return cb();
      });
    },
    send: [
      'office',
      'sender',
      'branch',
      (cb, results) => {
        var job = Job.queue.create(job_type, job_data).removeOnComplete(true);
        process.domain.jobs.push(job);

        return cb();
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb();
  });
};

CompactListing.publicize = function(model) {
  if(model.total) delete model.total;

  publicizeSensitive(model);

  return model;
};

CompactListing.associations = {
  list_agent: {
    optional: true,
    model: 'Agent'
  }
};

Listing.associations = {
  list_agent: {
    optional: true,
    model: 'Agent'
  }
};

module.exports = function(){};
