var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var crypto = require('crypto');
var sql = require('../utils/require_sql.js');
var async = require('async');

Alert = {};

var schema = {
  type: 'object',
  properties: {
    minimum_price: {
      type: 'number',
      minimum: 0,
      required: true
    },

    maximum_price: {
      type: 'number',
      minimum: 0,
      required: true
    },

    min_bedrooms: {
      type: 'number',
      minimum: 0,
      maximum: 3,
      required: true
    },

    min_bathrooms: {
      type: 'number',
      minimum: 1,
      maximum: 4,
      required: true
    },

    minimum_square_meters: {
      type: 'number',
      minimum: 0,
      required: true
    },

    maximum_square_meters: {
      type: 'number',
      minimum: 0,
      required: true
    },

    created_by: {
      type: 'string',
      uuid: true,
      required: true
    },

    location: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          required: true
        },

        longitude: {
          type: 'number',
          required: true
        }
      }
    },

    minimum_lot_size: {
      type: 'number',
      required: false,
      minimum: 0
    },

    maximum_lot_size: {
      type: 'number',
      required: false,
      minimum: 0
    },

    title: {
      type: 'string',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects
var sql_get = require("../sql/alert/get.sql");
var sql_insert = require('../sql/alert/insert.sql');
var sql_patch = require('../sql/alert/patch.sql');
var sql_delete = require('../sql/alert/delete.sql');
var sql_shortlist = require('../sql/alert/shortlist.sql');

Alert.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(Error.ResourceNotFound());

    var alert = res_base.rows[0];

    async.parallel({
      created_by: function(cb) {
        if (!alert.created_by)
          return cb();

        User.get(alert.created_by, cb);
      },
      shortlist: function(cb) {
        if(!alert.shortlist)
          return cb();

        Shortlist.get(alert.shortlist, cb);
      },
      location: function(cb) {
        if(!alert.location)
          return cb();

        var location = JSON.parse(alert.location);
        cb(null, {longitude: location.coordinates[0], latitude: location.coordinates[1]});
      }
    }, function(err, results) {
         var res_final = alert;
         res_final.created_by = results.created_by || null;
         res_final.shortlist = results.shortlist || null;
         res_final.location = results.location || null;

         cb(null, res_final);
       });
  });
}

Alert.getOnShortlist = function(shortlist, cb) {
  db.query(sql_shortlist, [shortlist], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var alert_ids = res.rows.map(function(r) {
                      return r.id;
                    });
    async.map(alert_ids, Alert.get, function(err, alerts) {
      if(err)
        return cb(err);

      return cb(null, alerts);
    });
  });
}

Alert.create = function(shortlist_id, alert, cb) {
  validate(alert, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [alert.currency,
                          alert.minimum_price,
                          alert.maximum_price,
                          alert.min_bedrooms,
                          alert.min_bathrooms,
                          alert.minimum_square_meters,
                          alert.maximum_square_meters,
                          alert.created_by,
                          shortlist_id,
                          alert.location.longitude,
                          alert.location.latitude,
                          alert.title],
             function(err, res) {
               if(err)
                 return cb(err);

               Alert.get(res.rows[0].id, function(err, alert) {
                 if(err)
                   return cb(err);

                 cb(null, alert);
               });
             });
    });
}

Alert.patch = function(shortlist_id, alert_id, alert, cb) {
  Alert.get(alert_id, function(err, data) {
    if(err)
      return cb(err);

    for(var i in alert)
      data[i] = alert[i];

    db.query(sql_patch, [data.currency,
                         data.minimum_price,
                         data.maximum_price,
                         data.min_bedrooms,
                         data.min_bathrooms,
                         data.minimum_square_meters,
                         data.maximum_square_meters,
                         data.created_by.id,
                         shortlist_id,
                         data.location.longitude,
                         data.location.latitude,
                         data.title,
                         alert_id],
             function(err, res) {
               if(err)
                 return cb(err);

               Alert.get(alert_id, function(err, alert) {
                 if(err)
                   return cb(err);

                 cb(null, alert);
               });
             });
  });
}

Alert.delete = function(id, cb) {
  Alert.get(id, function(err, alert) {
    if(err)
      return cb(err);

    db.query(sql_delete, [id], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, true);
    });
  });
}

Alert.publicize = function(model) {
  if (model.created_by) User.publicize(model.created_by);
  if (model.shortlist) Shortlist.publicize(model.shortlist);

  return model;
}
