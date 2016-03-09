var validator = require('../utils/validator.js');
var db        = require('../utils/db.js');
var async     = require('async');

CMA = {};

var sql_insert = require('../sql/cma/insert.sql');
var sql_get    = require('../sql/cma/get.sql');
var sql_room   = require('../sql/cma/room.sql');
var sql_delete = require('../sql/cma/delete.sql');

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

    median_price: {
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

    median_dom: {
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
          cma.median_price,
          cma.average_price,
          cma.highest_price,
          cma.lowest_dom,
          cma.median_dom,
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

    async.auto({
      main_listing: cb => {
        return Listing.get(cma.main_listing, cb);
      }
    }, (err, results) => {
      if(err)
        return cb(err);

      cma.main_listing = results.main_listing || null;

      return cb(null, cma);
    });
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

CMA.publicize = function(model) {
  if(model.main_listing) Listing.publicize(model.main_listing);
  if(model.user) User.publicize(model.user);
  if(model.room) Room.publicize(model.room);

  return model;
};
