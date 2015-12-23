/**
 * @namespace Transaction
 */

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

var async      = require('async');
var validator  = require('../utils/validator.js');
var db         = require('../utils/db.js');
var config     = require('../config.js');
var _u         = require('underscore');
var sql_insert = require('../sql/transaction/insert.sql');
var sql_get    = require('../sql/transaction/get.sql');
var sql_room   = require('../sql/transaction/room.sql');
var sql_delete = require('../sql/transaction/delete.sql');

Transaction = {};

var schema = {
  type: 'object',
  properties: {
    room: {
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
    room: function(cb) {
      return Room.get(transaction.room, cb);
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
             'room',
             'listing',
             'recommendation',
             function(cb, results) {
               var listing = (results.recommendation) ? results.recommendation.listing.id : (
                 (results.listing) ? results.listing.id : null);
               var transaction_status = (listing) ? listing.status : 'Active';
               var listing_data = results.listing_data;
               for (var i in transaction.listing_data)
                 listing_data[i] = transaction.listing_data[i];

               db.query(sql_insert, [
                 transaction.room,
                 transaction.title,
                 transaction.recommendation,
                 listing,
                 listing_data,
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

    async.auto({
      room: function(cb) {
        return Room.get(transaction.room, cb);
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
      patch: ['room',
              'listing',
              'recommendation',
              function(cb, results) {
                transaction.room = (data.room) ? data.room :
                  ((transaction.room) ? transaction.room.id : null);
                transaction.recommendation = (data.recommendation) ? data.recommendation :
                  ((transaction.recommendation) ? transaction.recommendation.id : null);
                transaction.listing = (data.listing) ? data.listing :
                  ((transaction.listing) ? transaction.listing.id : null);

                var listing = (results.recommendation) ? results.recommendation.listing.id : (
                  (results.listing) ? results.listing.id : null);

                db.query(sql_patch, [
                  transaction.room,
                  transaction.title,
                  transaction.recommendation,
                  listing,
                  transaction.listing_data,
                  transaction.transaction_type,
                  transaction.buyer,
                  transaction.seller,
                  transaction.buyer_agent,
                  transaction.seller_agent,
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
                  transaction.escrow_number,
                  transaction.co_buyer_agent,
                  transaction.co_seller_agent,
                  transaction.lawyer,
                  transaction.lender,
                  transaction.broker,
                  transaction.team_lead,
                  transaction.appraiser,
                  transaction.inspector
                  transaction_id,
    ])

              }]
    }, function(err, results) {

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
      room: function(cb) {
        if(!transaction.room)
          return cb();

        return Room.get(transaction.room, cb);
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
      buyer: function(cb) {
        if(!transaction.buyer)
          return cb();

        return Contact.get(transaction.buyer, cb);
      },
      seller: function(cb) {
        if(!transaction.seller)
          return cb();

        return Contact.get(transaction.seller, cb);
      },
      buyer_agent: function(cb) {
        if(!transaction.buyer_agent)
          return cb();

        return Contact.get(transaction.buyer_agent, cb);
      },
      seller_agent: function(cb) {
        if(!transaction.seller_agent)
          return cb();

        return Contact.get(transaction.seller_agent, cb);
      },
      co_buyer_agent: function(cb) {
        if(!transaction.co_buyer_agent)
          return cb();

        return Contact.get(transaction.co_buyer_agent, cb);
      },
      co_seller_agent: function(cb) {
        if(!transaction.co_seller_agent)
          return cb();

        return Contact.get(transaction.co_seller_agent, cb);
      },
      lawyer: function(cb) {
        if(!transaction.lawyer)
          return cb();

        return Contact.get(transaction.lawyer, cb);
      },
      lender: function(cb) {
        if(!transaction.lender)
          return cb();

        return Contact.get(transaction.lender, cb);
      },
      broker: function(cb) {
        if(!transaction.broker)
          return cb();

        return Contact.get(transaction.broker, cb);
      },
      team_lead: function(cb) {
        if(!transaction.team_lead)
          return cb();

        return Contact.get(transaction.team_lead, cb);
      },
      appraiser: function(cb) {
        if(!transaction.appraiser)
          return cb();

        return Contact.get(transaction.appraiser, cb);
      },
      inspector: function(cb) {
        if(!transaction.inspector)
          return cb();

        return Contact.get(transaction.inspector, cb);
      }
    }, function(err, results) {
      if(err)
        return cb(err);

      transaction.room = results.room || null;
      transaction.listing = results.listing || null;
      transaction.recommendation = results.recommendation || null;
      transaction.buyer = results.buyer || null;
      transaction.seller = results.seller || null;
      transaction.buyer_agent = results.buyer_agent || null;
      transaction.seller_agent = results.seller_agent || null;
      transaction.co_buyer_agent = results.buyer_agent || null;
      transaction.co_seller_agent = results.seller_agent || null;
      transaction.lawyer = results.lawyer || null;
      transaction.lender = results.lender || null;
      transaction.broker = results.broker || null;
      transaction.team_lead = results.team_lead || null;
      transaction.appraiser = results.appraiser || null;
      transaction.inspector = results.inspector || null;

      return cb(null, transaction);
    });
  });
};

Transaction.getForRoom = function(room_id, cb) {
  db.query(sql_room, [room_id], function(err, res) {
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
