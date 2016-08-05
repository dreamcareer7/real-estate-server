/**
 * @namespace Idate
 */

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

var async           = require('async');
var validator       = require('../utils/validator.js');
var db              = require('../utils/db.js');
var config          = require('../config.js');
var _u              = require('underscore');
var sql_insert      = require('../sql/idate/insert.sql');
var sql_patch       = require('../sql/idate/patch.sql');
var sql_get         = require('../sql/idate/get.sql');
var sql_transaction = require('../sql/idate/transaction.sql');
var sql_delete      = require('../sql/idate/delete.sql');

Idate = {};

Orm.register('important_date', Idate);

var schema = {
  type: 'object',
  properties: {
    transaction: {
      type: 'string',
      uuid: true,
      required: true
    },
    title: {
      type: 'string',
      required: true
    },
    due_date: {
      type: 'number',
      required: false
    }
  }
};

var validate = validator.bind(null, schema);

Idate.create = function(idate, cb) {
  async.auto({
    validate: function(cb) {
      return validate(idate, cb);
    },
    create: ['validate',
             function(cb, results) {
               db.query(sql_insert, [
                 idate.transaction,
                 idate.title,
                 idate.due_date
               ], function(err, res) {
                 if(err)
                   return cb(err);

                 return cb(null, res.rows[0].id);
               });
             }]
  }, function(err, results) {
    if(err)
      return cb(err);

    return Idate.get(results.create, cb);
  });
};

Idate.patch = function(idate_id, data, cb) {
  Idate.get(idate_id, function(err, idate) {
    for (var i in data)
      idate[i] = data[i];

    async.auto({
      patch: function(cb) {
        db.query(sql_patch, [
          idate.title,
          idate.due_date,
          idate_id
        ], cb);
      },
      get: ['patch',
            function(cb, results) {
              return Idate.get(idate_id, cb);
            }]
    }, function(err, results) {
         if(err)
           return cb(err);

      return cb(null, results.get);
    });
  });
};

Idate.get = function(idate_id, cb) {
  db.query(sql_get, [idate_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Idate not found'));

    var idate = res.rows[0];
    return cb(null, idate);
  });
};

Idate.getForTransaction = function(transaction_id, cb) {
  db.query(sql_transaction, [transaction_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var idate_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(idate_ids, Idate.get, function(err, idates) {
      if(err)
        return cb(err);

      return cb(null, idates);
    });
  });
};

Idate.delete = function(idate_id, cb) {
  Idate.get(idate_id, function(err) {
    if(err)
      return cb(err);

    db.query(sql_delete, [idate_id], function(err) {
      if(err)
        return cb(err);

      return cb();
    });
  });
};

Idate.publicize = function(model) {
  if(model.user) delete model.user;

  return model;
};

module.exports = function () {};
