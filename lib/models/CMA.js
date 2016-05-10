var validator = require('../utils/validator.js');
var db        = require('../utils/db.js');
var async     = require('async');
var config    = require('../config.js');

CMA = {};

var sql_insert = require('../sql/cma/insert.sql');
var sql_get    = require('../sql/cma/get.sql');
var sql_room   = require('../sql/cma/room.sql');
var sql_delete = require('../sql/cma/delete.sql');

var html_cma_share_body = require('../html/cma/share.html');
var asc_cma_share_body  = require('../asc/cma/share.asc');

var schema = {
  type: 'object',
  properties: {
    suggested_price: {
      type: 'number',
      required: false
    },

    comment: {
      type: 'string',
      required: false
    },

    user: {
      type: 'string',
      uuid: true,
      required: true
    },

    room: {
      type: 'string',
      uuid: true,
      required: true
    },

    main_listing: {
      type: 'string',
      uuid: true,
      required: true
    },

    listings: {
      type: 'array',
      required: true,
      minItems: 1,
      items: {
        type: 'string',
        uuid: true,
        required: true
      }
    },

    lowest_price: {
      type: 'number',
      required: true
    },

    average_price: {
      type: 'number',
      required: true
    },

    highest_price: {
      type: 'number',
      required: true
    },

    lowest_dom: {
      type: 'number',
      required: true
    },

    average_dom: {
      type: 'number',
      required: true
    },

    highest_dom: {
      type: 'number',
      required: true
    }
  }
};

var validate = validator.bind(null, schema);

CMA.create = function(cma, cb) {
  async.auto({
    validate: cb => {
      return validate(cma, cb);
    },
    user: cb => {
      return User.get(cma.user, cb);
    },
    room: cb => {
      return Room.get(cma.room, cb);
    },
    listings: cb => {
      return async.map(cma.listings, Listing.get, cb);
    },
    create: [
      'validate',
      'user',
      'room',
      'listings',
      (cb) => {
        return db.query(sql_insert, [
          cma.user,
          cma.room,
          cma.suggested_price,
          cma.comment,
          cma.main_listing,
          cma.listings,
          cma.lowest_price,
          cma.average_price,
          cma.highest_price,
          cma.lowest_dom,
          cma.average_dom,
          cma.highest_dom,
        ], (err, res) => {
          if(err)
            return cb(err);

          return cb(null, res.rows[0].id);
        });
      }
    ],
    notification: [
      'user',
      'room',
      'create',
      (cb, results) => {
        var notification = {};

        notification.action = 'Created';
        notification.subject = cma.user;
        notification.subject_class = 'User';
        notification.object = results.create;
        notification.object_class = 'CMA';
        notification.auxiliary_object = cma.room;
        notification.auxiliary_object_class = 'Room';
        notification.message = '@' + results.user.first_name + ' created a CMA for room #' + results.room.title;
        notification.room = cma.room;

        return Notification.issueForRoomExcept(notification, cma.user, cb);
      }
    ],
    get: [
      'create',
      (cb, results) => {
        return CMA.get(results.create, cb);
      }
    ]
  }, function(err, results) {
    if(err)
      return cb(err);

    return cb(null, results.get);
  });
};

CMA.get = function(id, cb) {
  db.query(sql_get, [id], (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('CMA not found'));

    var cma = res.rows[0];
    cb(null, cma);
  });
};

CMA.delete = function(id, cb) {
  CMA.get(id, err => {
    if(err)
      return cb(err);

    db.query(sql_delete, [id], err => {
      if(err)
        return cb(err);

      return cb();
    });
  });
};

CMA.getForRoom = function(id, cb) {
  Room.get(id, err => {
    if(err)
      return cb(err);

    db.query(sql_room, [id], (err, res) => {
      if(err)
        return cb(err);

      if (res.rows.length < 1)
        return cb(null, []);

      var cma_ids = res.rows.map(r => r.id);
      return async.map(cma_ids, CMA.get, cb);
    });
  });
};

CMA.getListings = function(id, cb) {
  CMA.get(id, (err, cma) => {
    if(err)
      return cb(err);

    async.map(cma.listings, Listing.get, cb);
  });
};

CMA.processEmail = function(job, cb) {
  var data = job.data;

  return Email.send({
    from: 'mailer@' + config.email.seamless_address,
    to: [ data.to ],
    source: config.email.source,
    html_body: html_cma_share_body,
    suppress_outer_template: true,
    mailgun_options: {
      'h:Reply-To': data.from
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

CMA.processSMS = function(job, cb) {
  var data = job.data;

  if(!data.to)
    return cb();

  return SMS.send({
    from: config.twilio.from,
    to: data.to,
    body: asc_cma_share_body,
    template_params: data
  }, cb);
};

CMA.sendAsEmail = function(data, cb) {
  CMA.send('email', data, cb);
};

CMA.sendAsSMS = function(data, cb) {
  CMA.send('sms', data, cb);
};

CMA.send = function(transport, data, cb) {
  var job_data = {
    first_name: data.user.first_name,
    address: '3700 McFly Foo',
    average_price: '$450k',
    // sender_name: Resolved by async.auto
    photo_uri: 'https://cdn.rechat.com/59390859.jpg',
    listing_uri: 'https://rechat.com',
    agency_name: 'AGENCY NAME',
    agency_phone: '+1 975 211 6542',
    status_color: '#66ff66',
    subject: 'Rechat',
    status: 'Active',
    price: '$450k',
    area: 'GREY AREA',
    city: 'GOTHAM CITY',
    active_count: '10',
    pending_count: '15',
    sold_count: '20',
    avatar: 'http://assets.rechat.co/mail/avatar.png',
    agent_name: 'Marty McFly',
    mls_terms: 'THIS OUR MLS TERMS',
    url: 'https://rechat.com',
    _title: ''
  };

  var job_type = 'cma_share_' + transport;

  switch(transport) {
  case 'sms':
    job_data.to = data.user.phone_number;
    job_data.from = config.twilio.from;
    break;

  case 'email':
    job_data.to = data.user.email;
    job_data.from = data.room + '@' + config.email.seamless_address;
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

        return cb();
      });
    },
    send: [
      'sender',
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

CMA.publicize = function(model) {
  if(model.main_listing) Listing.publicize(model.main_listing);
  if(model.user) User.publicize(model.user);
  if(model.room) Room.publicize(model.room);

  return model;
};


CMA.associations = {
  main_listing: {
    model: 'Listing'
  }
}