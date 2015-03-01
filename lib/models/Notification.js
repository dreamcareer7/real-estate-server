var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var sql = require('../utils/require_sql.js');
var async = require('async');

Notification = {};

var schema = {
  type: 'object',
  properties: {
    notification_type: {
      type: 'string',
      enum: ['Message', 'Favorited', 'CoshopperAdded', 'ListingPriceChange', 'MessageRoomActivity'],
      required: true
    },

    object: {
      type: 'string',
      uuid: true,
      required: false
    },

    message: {
      type: 'string',
      required: true
    },

    image_url: {
      type: 'string',
      required: false
    },

    referred_user: {
      type: 'string',
      uuid: true,
      required: true
    },

    referred_shortlist: {
      type: 'string',
      uuid: true,
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects
var sql_get = require("../sql/notification/get.sql");
var sql_insert = require('../sql/notification/insert.sql');
var sql_user = require('../sql/notification/user.sql');
var sql_patch = require('../sql/notification/patch.sql');
var sql_delete = require('../sql/notification/delete.sql');
var sql_user_shortlist = require('../sql/notification/user_shortlist.sql');

Notification.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(null, false);

    var notification = res_base.rows[0];

    async.parallel({
      referred_user: function(cb) {
        if (!notification.referred_user)
          return cb();

        User.get(notification.referred_user, cb);
      },
      referred_shortlist: function(cb) {
        if(!notification.referred_shortlist)
          return cb();

        Shortlist.get(notification.referred_shortlist, cb);
      },
      object: function(cb) {
        if(!notification.object)
          return cb();

        MessageRoom.get(notification.object, cb);
      }
    }, function(err, results) {
         var res_final = notification;
         res_final.referred_user = results.referred_user || null;
         res_final.referred_shortlist = results.referred_shortlist || null;
         res_final.object = results.object || null;

         cb(null, res_final);
       });
  });
}

Notification.create = function(notification, cb) {
  validate(notification, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
      notification.notification_type,
      notification.object,
      notification.message,
      notification.referred_user,
      notification.referred_shortlist
    ], function(err, res) {
         if(err)
           return cb(err);

         Notification.get(res.rows[0].id, function(err, notification) {
           if(err)
             return cb(err);

           cb(null, notification);
         });
       });
  });
}

Notification.getForUser = function(user_id, cb) {
  db.query(sql_user, [user_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var notification_ids = res.rows.map(function(r) {
                           return r.id;
                         });
    async.map(notification_ids, Notification.get, function(err, notifications) {
      if(err)
        return cb(err);

      return cb(null, notifications);
    });
  });
}

Notification.getForUserOnShorlist = function(user_id, shortlist_id, cb) {
  db.query(sql_user_shortlist, [user_id, shortlist_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var notification_ids = res.rows.map(function(r) {
                           return r.id;
                         });
    async.map(notification_ids, Notification.get, function(err, notifications) {
      if(err)
        return cb(err);

      return cb(null, notifications);
    });
  });
}

Notification.patch = function(notification_id, read, cb) {
  db.query(sql_patch, [notification_id, read], function(err, res) {
    if(err)
      return cb(err);

    Notification.get(notification_id, function(err, notification) {
      if(err)
        return cb(err);

          return cb(null, notification);
    });
  });
}

Notification.delete = function(id, cb) {
  db.query(sql_delete, [id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, true);
  });
}

Notification.publicize = function(model) {
  if(model.referred_user) User.publicize(model.referred_user);
  if(model.referred_shortlist) Shortlist.publicize(model.referred_shortlist);

  return model;
}
