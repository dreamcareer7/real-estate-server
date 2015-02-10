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
      type: 'integer',
      required: true
    },

    maximum_price: {
      type: 'integer',
      required: true
    },

    bedroom_type: {
      type: 'string',
      enum: [ 'Studio', 'OnePlus', 'TwoPlus', 'ThreePlus' ],
      required: true
    },

    bathroom_type: {
      type: 'string',
      enum: [ 'OnePlus', 'TwoPlus', 'ThreePlus', 'FourPlus' ],
      required: true
    },

    minimum_square_meters: {
      type: 'integer',
      required: true
    },

    maximum_square_meters: {
      type: 'integer',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects
var sql_get = require("../sql/alert/get.sql");
var sql_insert = require('../sql/alert/insert.sql');

Alert.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(null, false);

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
      }
    }, function(err, results) {
         var res_final = alert;
         res_final.created_by = results.created_by || {};
         res_final.shortlist = results.shortlist || {};

         cb(null, res_final);
       });
  });
}

Alert.create = function(user_id, shortlist_id, alert, cb) {
  validate(alert, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [alert.currency,
                          alert.minimum_price,
                          alert.maximum_price,
                          alert.bedroom_type,
                          alert.bathroom_type,
                          alert.minimum_square_meters,
                          alert.maximum_square_meters,
                          user_id,
                          shortlist_id],
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

Alert.publicize = function(model) {
  if (model.created_by) User.publicize(model.created_by);
  if (model.shortlist) Shortlist.publicize(model.shortlist);
}
