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
      required: true
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

    listings: {
      type: 'array',
      required: true,
      minItems: 1,
      items: {
        type: 'string',
        uuid: true,
        required: true
      }
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
          cma.listings
        ], (err, res) => {
          if(err)
            return cb(err);

          return cb(null, res.rows[0].id);
        });
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
  db.query(sql_get, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('CMA not found'));

    var cma = res.rows[0];

    async.auto({
      user: cb => {
        return User.get(cma.user, cb);
      },
      room: cb => {
        return Room.get(cma.room, cb);
      }
    }, function(err, results) {
      if(err)
        return cb(err);

      cma.user = results.user || null;
      cma.room = results.room || null;

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

CMA.publicize = function(model) {
  if(model.user) User.publicize(model.user);
  if(model.room) Room.publicize(model.room);

  return model;
};
