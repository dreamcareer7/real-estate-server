/**
 * @namespace Transaction
 */

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

var async        = require('async');
var validator    = require('../utils/validator.js');
var db           = require('../utils/db.js');
var config       = require('../config.js');
var _u           = require('underscore');
var sql_insert   = require('../sql/transaction/insert.sql');
var sql_patch    = require('../sql/transaction/patch.sql');
var sql_get      = require('../sql/transaction/get.sql');
var sql_user     = require('../sql/transaction/user.sql');
var sql_delete   = require('../sql/transaction/delete.sql');
var sql_assign   = require('../sql/transaction/assign.sql');
var sql_withdraw = require('../sql/transaction/withdraw.sql');

Transaction = {};

var schema = {
  type: 'object',
  properties: {
    user: {
      type: 'string',
      uuid: true,
      required: true
    },

    title: {
      type: 'string',
      required: false
    },

    recommendation: {
      type: 'string',
      uuid: true,
      required: false
    },

    listing: {
      type: 'string',
      uuid: true,
      required: false
    },

    listing_data: {
      type: 'object',
      required: false
    },

    transaction_type: {
      type: 'string',
      required: true,
      enum: ['Buyer', 'Seller', 'Buyer/Seller', 'Lease']
    },

    transaction_status: {
      type: 'string',
      required: 'true',
      enum: ['Active', 'Sold', 'Pending',
             'Temp Off Market', 'Leased', 'Active Option Contract',
             'Active Contingent', 'Active Kick Out', 'Withdrawn',
             'Expired', 'Cancelled', 'Withdrawn Sublisting',
             'Incomplete', 'Incoming']
    },

    contacts: {
      type: 'array',
      required: false,
      minItems: 1,
      items: {
        type: 'string',
        required: true,
        uuid: true
      }
    },

    contract_price: {
      type: 'number',
      required: false
    },

    original_price: {
      type: 'number',
      required: false
    },

    sale_commission_rate: {
      type: 'number',
      required: false
    },

    buyer_sale_commission_split_share: {
      type: 'number',
      required: false
    },

    seller_sale_commission_split_share: {
      type: 'number',
      required: false
    },

    buyer_sale_commission_split: {
      type: 'number',
      required: false
    },

    seller_sale_commission_split: {
      type: 'number',
      required: false
    },

    broker_commission: {
      type: 'number',
      required: false
    },

    referral: {
      type: 'number',
      required: false
    },

    sale_commission_total: {
      type: 'number',
      required: false
    },

    earnest_money_amount: {
      type: 'number',
      required: false
    },

    earnest_money_held_by: {
      type: 'number',
      required: false
    },

    escrow_number: {
      type: 'string',
      required: false
    }
  }
};

var validate = validator.bind(null, schema);

Transaction.create = function(transaction, cb) {
  async.auto({
    validate: function(cb) {
      return validate(transaction, cb);
    },
    user: function(cb) {
      return User.get(transaction.user, cb);
    },
    listing: function(cb) {
      if(!transaction.listing)
        return cb();

      return Listing.get(transaction.listing, cb);
    },
    recommendation: function(cb) {
      if(!transaction.recommendation)
        return cb();

      return Recommendation.get(transaction.recommendation, cb);
    },
    create: ['validate',
             'user',
             'listing',
             'recommendation',
             function(cb, results) {
               var listing = (results.recommendation) ? results.recommendation.listing.id : (
                 (results.listing) ? results.listing.id : null);
               var transaction_status = (results.listing) ? results.listing.status : 'Active';
               for (var i in transaction.listing_data)
                 listing_data[i] = transaction.listing_data[i];

               db.query(sql_insert, [
                 transaction.user,
                 transaction.title,
                 transaction.recommendation,
                 listing,
                 transaction.listing_data,
                 transaction.transaction_type,
                 transaction_status,
                 transaction.contract_price,
                 transaction.original_price,
                 transaction.sale_commission_rate,
                 transaction.buyer_sale_commission_split_share,
                 transaction.seller_sale_commission_split_share,
                 transaction.buyer_sale_commission_split,
                 transaction.seller_sale_commission_split,
                 transaction.broker_commission,
                 transaction.referral,
                 transaction.sale_commission_total,
                 transaction.earnest_money_amount,
                 transaction.earnest_money_held_by,
                 transaction.escrow_number
               ], function(err, res) {
                 if(err)
                   return cb(err);

                 return cb(null, res.rows[0].id);
               });
             }],
    contacts: ['create',
               (cb, results) => {
                 if(!transaction.contacts)
                   return cb();

                 async.map(transaction.contacts, (r, cb) => {
                   Transaction.assign(results.create, r, cb);
                 }, cb);
               }]
  }, function(err, results) {
    if(err)
      return cb(err);

    return Transaction.get(results.create, cb);
  });
};

Transaction.patch = function(transaction_id, data, cb) {
  Transaction.get(transaction_id, function(err, transaction) {
    for (var i in data)
      transaction[i] = data[i];

    transaction.recommendation = (data.recommendation) ? data.recommendation :
      ((transaction.recommendation) ? transaction.recommendation.id : null);
    transaction.listing = (data.listing) ? data.listing :
      ((transaction.listing) ? transaction.listing.id : null);

    async.auto({
      user: function(cb) {
        return User.get(transaction.user, cb);
      },
      listing: function(cb) {
        if(!transaction.listing)
          return cb();

        return Listing.get(transaction.listing, cb);
      },
      recommendation: function(cb) {
        if(!transaction.recommendation)
          return cb();

        return Recommendation.get(transaction.recommendation, cb);
      },
      patch: ['user',
              'listing',
              'recommendation',
              function(cb, results) {
                var listing_data = (transaction.listing_data) ? transaction.listing_data : results.listing;
                db.query(sql_patch, [
                  transaction.title,
                  transaction.recommendation,
                  transaction.listing,
                  listing_data,
                  transaction.transaction_type,
                  transaction.transaction_status,
                  transaction.contract_price,
                  transaction.original_price,
                  transaction.sale_commission_rate,
                  transaction.buyer_sale_commission_split_share,
                  transaction.seller_sale_commission_split_share,
                  transaction.buyer_sale_commission_split,
                  transaction.seller_sale_commission_split,
                  transaction.broker_commission,
                  transaction.referral,
                  transaction.sale_commission_total,
                  transaction.earnest_money_amount,
                  transaction.earnest_money_held_by,
                  transaction.escrow_number,
                  transaction_id
                ], cb);
              }],
      get: ['patch',
            function(cb, results) {
              return Transaction.get(transaction_id, cb);
            }]
    }, function(err, results) {
         if(err)
           return cb(err);

         return cb(null, results.get);
    });
  });
};

Transaction.get = function(transaction_id, cb) {
  db.query(sql_get, [transaction_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Transaction not found'));

    var transaction = res.rows[0];

    async.parallel({
      user: function(cb) {
        if(!transaction.user)
          return cb();

        return User.get(transaction.user, cb);
      },
      listing: function(cb) {
        if(!transaction.listing)
          return cb();

        return Listing.get(transaction.listing, cb);
      },
      recommendation: function(cb) {
        if(!transaction.recommendation)
          return cb();

        return Recommendation.get(transaction.recommendation, cb);
      },
      contacts: function(cb) {
        if(!transaction.contacts)
          return cb();

        return async.map(transaction.contacts, Contact.get, cb);
      },
      important_dates: function(cb) {
        if(!transaction.important_dates)
          return cb();

        return async.map(transaction.important_dates, Idate.get, cb);
      }
    }, function(err, results) {
      if(err)
        return cb(err);

      transaction.user = results.user || null;
      transaction.listing = results.listing || null;
      transaction.recommendation = results.recommendation || null;
      transaction.contacts = results.contacts || null;
      transaction.important_dates = results.important_dates || null;

      return cb(null, transaction);
    });
  });
};

Transaction.getForUser = function(user_id, cb) {
  db.query(sql_user, [user_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var transaction_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(transaction_ids, Transaction.get, function(err, transactions) {
      if(err)
        return cb(err);

      return cb(null, transactions);
    });
  });
};

Transaction.delete = function(transaction_id, cb) {
  Transaction.get(transaction_id, function(err) {
    if(err)
      return cb(err);

    db.query(sql_delete, [transaction_id], function(err) {
      if(err)
        return cb(err);

      return cb();
    });
  });
};

Transaction.assign = function(transaction_id, contact_id, cb) {
  Transaction.get(transaction_id, function(err) {
    if(err)
      return cb(err);

    Contact.get(contact_id, function(err) {
      if(err)
        return cb(err);

      return db.query(sql_assign, [transaction_id, contact_id], cb);
    });
  });
};

Transaction.withdraw = function(transaction_id, contact_id, cb) {
  Transaction.get(transaction_id, function(err) {
    if(err)
      return cb(err);

    Contact.get(contact_id, function(err) {
      if(err)
        return cb(err);

      return db.query(sql_withdraw, [transaction_id, contact_id], cb);
    });
  });
};

Transaction.publicize = function(model) {
  if(model.contacts) model.contacts.map(Contact.publicize);
  if(model.user) delete model.user;

  return model;
};

module.exports = function () {};
