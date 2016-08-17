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

Orm.register('listing', Listing);
Orm.register('compact_listing', CompactListing);

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
var sql_insert           = require('../sql/listing/insert.sql');
var sql_update           = require('../sql/listing/update.sql');
var sql_get              = require('../sql/listing/get.sql');
var sql_get_compacts     = require('../sql/listing/get_compacts.sql');
var sql_get_mui          = require('../sql/listing/get_mui.sql');
var sql_get_mls_number   = require('../sql/listing/get_mls_number.sql');
var sql_delete           = require('../sql/listing/delete.sql');
var sql_matching         = require('../sql/listing/matching.sql');
var sql_interested       = require('../sql/listing/interested.sql');
var sql_string_search    = require('../sql/listing/string_search.sql');
var sql_get_statuses     = require('../sql/listing/get_statuses.sql');

var sql_get_area         = require('../sql/listing/area/get_by_area.sql');
var sql_search_mls_area  = require('../sql/listing/area/search.sql');
var sql_mls_area         = require('../sql/listing/area/get.sql');
var sql_refresh_areas    = require('../sql/listing/area/refresh.sql');

var sql_refresh_counties = require('../sql/listing/county/refresh.sql');
var sql_search_county    = require('../sql/listing/county/search.sql');

var sql_refresh_subdiv   = require('../sql/listing/subdivision/refresh.sql');
var sql_search_subdiv    = require('../sql/listing/subdivision/search.sql');

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

    var vals = [
      listing.price,
      listing.property.square_meters,
      listing.property.bedroom_count,
      listing.property.bathroom_count,
      listing.property.property_type,
      listing.property.property_subtype,
      listing.property.address.location ? listing.property.address.location.longitude : null,
      listing.property.address.location ? listing.property.address.location.latitude : null,
      listing.property.year_built,
      listing.property.pool_yn,
      listing.property.lot_square_meters,
      listing.status,
      listing.property.parking_spaces_covered_total,
      listing.list_office_mls_id,
      listing.list_agent_mls_id,
      listing.selling_office_mls_id,
      listing.selling_agent_mls_id,
      listing.property.architectural_style,
      listing.property.address.county_or_parish,
      listing.property.subdivision_name,
      listing.property.school_district,
      listing.property.primary_school_name,
      listing.property.middle_school_name,
      listing.property.elementary_school_name,
      listing.property.senior_high_school_name,
      listing.property.junior_high_school_name,
      listing.property.intermediate_school_name,
      listing.mls_area_major,
      listing.mls_area_minor
    ];

    db.query(sql_matching, vals, function(err, res) {
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

    return cb(null, res.rows);
  });
};

Listing.issueChangeNotifications = function(listing_id, before, after, cb) {
  async.auto({
    listing: cb => {
      return Listing.get(listing_id, cb);
    },
    interested: cb => {
      Listing.getInterestedRooms(listing_id, cb)
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
      'interested',
      (cb, results) => {
        if(after.price != before.price) {
          async.map(results.interested, (interested, cb) => {
            Room.get(interested.room, (err, room) => {
              if(err)
                return cb(err);

              var notification = {};
              notification.action = 'PriceDropped';
              notification.subject = listing_id;
              notification.subject_class = 'Listing';
              notification.object = interested.room;
              notification.object_class = 'Room';
              notification.recommendation = interested.room.recommendations;
              notification.room = interested.room;

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
      'interested',
      (cb, results) => {
        if(after.status != before.status) {
          async.map(results.interested, (interested, cb) => {
            Room.get(interested.room, (err, room) => {
              if(err)
                return cb(err);

              var notification = {};
              notification.action = 'StatusChanged';
              notification.subject = listing_id;
              notification.subject_class = 'Listing';
              notification.object = interested.room;
              notification.object_class = 'Room';
              notification.message = '#' + room.title + ': ' + results.address + ' is now ' + after.status;
              notification.recommendation = interested.recommendation;
              notification.room = interested.room;

              console.log('Status Change Notification:'.cyan,
                          ('#' + results.listing.matrix_unique_id).red,
                          '('.cyan, results.listing.id.yellow, ')'.cyan,
                          'on Room with ID:'.cyan,
                          room.id.yellow,
                          '*'.blue, results.address, '*'.blue,
                          'were:'.white, before.status, 'is now:'.white, after.status);
              Notification.issueForRoom(notification, cb);
            });
          }, cb);
        } else {
          return cb();
        }
      }
    ]
  }, cb);
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

Listing.getByArea = function(q, statuses, cb) {
  var areas = Alert.parseArea(q);

  db.query(sql_get_area, [
    areas.mls_area_major,
    areas.mls_area_minor,
    statuses,
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
}

function publicizeSensitive(l) {
  var user = process.domain.user;
  var type = user ? user.user_type : 'Guest';

  var properties = {
//     sub_agency_commission:              ['Agent', 'Brokerage'],
//     close_price:                        ['Agent', 'Brokerage'],
//     buyers_agency_commission:           ['Agent', 'Brokerage'],
//     listing_agreement:                  ['Agent', 'Brokerage'],
//     list_agent_mls_id:                  ['Agent', 'Brokerage'],
//     private_remarks:                    ['Agent', 'Brokerage'],
//     appointment_call:                   ['Agent', 'Brokerage'],
//     appointment_phone:                  ['Agent', 'Brokerage'],
//     owner_name:                         ['Agent', 'Brokerage'],
//     keybox_number:                      ['Agent', 'Brokerage'],
//     keybox_type:                        ['Agent', 'Brokerage'],
//     showing_instructions:               ['Agent', 'Brokerage'],
//     occupancy:                          ['Agent', 'Brokerage'],
//     seller_type:                        ['Agent', 'Brokerage'],
//     list_agent_direct_work_phone:       ['Agent', 'Brokerage'],
//     list_agent_email:                   ['Agent', 'Brokerage'],
//     co_list_agent_direct_work_phone:    ['Agent', 'Brokerage'],
//     co_list_agent_email:                ['Agent', 'Brokerage'],
//     selling_agent_direct_work_phone:    ['Agent', 'Brokerage'],
//     selling_agent_email:                ['Agent', 'Brokerage'],
//     co_selling_agent_direct_work_phone: ['Agent', 'Brokerage'],
//     co_selling_agent_email:             ['Agent', 'Brokerage'],
//     list_office_phone:                  ['Agent', 'Brokerage'],
//     co_list_office_phone:               ['Agent', 'Brokerage'],
//     selling_office_phone:               ['Agent', 'Brokerage'],
//     co_selling_office_phone:            ['Agent', 'Brokerage']
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


var transports = {};

transports.sms = function(data, cb) {
  return SMS.send({
    from: config.twilio.from,
    to: data.to,
    body: asc_listing_share_body,
    template_params: data,
    image:data.photo_uri
  }, cb);
};
Listing.sendAsSMSToNonUser = function(user_id, data, phone, cb) {
  async.auto({
    invite: cb => {
      return Invitation.invitePhoneNumberToNewRoom(user_id, phone, data.listing_title, cb);
    },
    send: [
      'invite',
      (cb, results) => {
        data.listing_uri = results.invite.url;

        return Listing.send('sms', data, cb);
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
    room_id:data.room.id,
    message:data.message,
    _title: ''
  };

  switch(transport) {
  case 'sms':
    job_data.to = data.user.phone_number;
    job_data.from = config.twilio.from;
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
        transports[transport](job_data, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb();
  });
};

Listing.inquiry = function(user_id, listing_id, agent_id, brand_id, source_type, external_info, cb) {
  async.auto({
    user: cb => {
      return User.get(user_id, cb);
    },
    brand: cb => {
      return Brand.get(brand_id, cb);
    },
    agent: cb => {
      if(!agent_id)
        return cb();

      return Agent.get(agent_id, cb);
    },
    listing: cb => {
      return Listing.get(listing_id, cb);
    },
    in_user: [
      'brand',
      'agent',
      (cb, results) => {
        var in_user = results.agent ? (results.agent.user_id || results.brand.default_user) : results.brand.default_user;

        if(!in_user)
          return cb(Error.Validation('Cannot find an agent to make an inquiry for this listing'));

        return cb(null, in_user);
      }
    ],
    room: [
      'in_user',
      (cb, results) => {
        return User.connectToUser(user_id, results.in_user, source_type, brand_id, cb);
      }
    ],
    recommendation: [
      'in_user',
      'room',
      (cb, results) => {
        external_info.ref_user_id = results.in_user;
        return Room.recommendListing(results.room, listing_id, external_info, cb);
      }
    ],
    message: [
      'room',
      'recommendation',
      'in_user',
      (cb, results) => {
        var message = {
          author: results.in_user,
          recommendation:results.recommendation.id,
          message_type: 'SubLevel',
          comment: 'I see that you\'re interested in this house. Let me know how I can help you.'
        };

        return Message.post(results.room, message, true, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, {
      action: 'listing_inquiry',
      listing: listing_id,
      room: results.room,
      agent: agent_id
    });
  });
};

Listing.refreshAreas = function(cb) {
  db.query(sql_refresh_areas, [], cb);
}

Listing.searchAreas = function(term, parents, cb) {
  db.query(sql_search_mls_area, [term, parents], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

Listing.getArea = function(pair, cb) {
  db.query(sql_mls_area, pair, (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
     return cb(Error.ResourceNotFound('MLS Area not found'));

    cb(null, res.rows[0]);
  });
}

MLSArea = {
  get: Listing.getArea
}

Listing.refreshCounties = function(cb) {
  db.query(sql_refresh_counties, [], cb);
}

Listing.searchCounties = function(term, cb) {
  db.query(sql_search_county, [term], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

Listing.refreshSubdivisions = function(cb) {
  db.query(sql_refresh_subdiv, [], cb);
}

Listing.searchSubdivisions = function(term, cb) {
  db.query(sql_search_subdiv, [term], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

CompactListing.publicize = function(model) {
  if(model.total) delete model.total;

  publicizeSensitive(model);

  return model;
};

CompactListing.associations = {
  list_agent: {
    optional: true,
    model: 'Agent',
    enabled:false
  },

  list_office: {
    optional: true,
    model: 'Office',
    enabled:false
  }
};

Listing.associations = {
  list_agent: {
    optional: true,
    model: 'Agent'
  }
};

module.exports = function(){};
