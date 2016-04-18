/**
 * @namespace Transaction
 */

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

var async                       = require('async');
var validator                   = require('../utils/validator.js');
var db                          = require('../utils/db.js');
var config                      = require('../config.js');
var _u                          = require('underscore');
var sql_insert                  = require('../sql/transaction/insert.sql');
var sql_patch                   = require('../sql/transaction/patch.sql');
var sql_get                     = require('../sql/transaction/get.sql');
var sql_user                    = require('../sql/transaction/user.sql');
var sql_delete                  = require('../sql/transaction/delete.sql');
var sql_assign                  = require('../sql/transaction/assign.sql');
var sql_withdraw                = require('../sql/transaction/withdraw.sql');
var sql_add_contact_role        = require('../sql/transaction/add_contact_role.sql');
var sql_remove_contact_role     = require('../sql/transaction/remove_contact_role.sql');
var sql_get_transaction_contact = require('../sql/transaction/get_transaction_contact.sql');
var sql_get_contact_role        = require('../sql/transaction/get_contact_role.sql');
var sql_assignees               = require('../sql/transaction/assignees.sql');

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
        type: 'object'
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

var schema_transaction_roles = {
  type: 'object',
  properties: {
    contact: {
      type: 'string',
      uuid: true,
      required: true
    },
    role_types: {
      type: 'array',
      required: true,
      minItems: 1,
      items: {
        type: 'string'
      }
    }
  }
};

var validate = validator.bind(null, schema);

Transaction.addRoles = function(transaction_id, roles, cb) {
  if (!roles)
    return cb();

  async.map(roles, (r, cb) => {
    validator(schema_transaction_roles, r, (err) => {
      if (err)
        return cb(err);

      Transaction.assign(transaction_id, r.contact, (err) => {
        if (err)
          return cb(err);

        Transaction.addContactRole(transaction_id, r.contact, r.role_types, cb);
      });
    });
  }, cb);
};

Transaction.create = function (transaction, cb) {
  if (!(process.domain.user.user_type == 'Agent' ||
        process.domain.user.user_type == 'Brokerage'))
    return cb(Error.Forbidden('Insufficient credentials: You are not allowed to create/edit transactions'));

  async.auto({
    validate: function (cb) {
      return validate(transaction, cb);
    },
    user: function (cb) {
      return User.get(transaction.user, cb);
    },
    listing: function (cb) {
      if (!transaction.listing)
        return cb();

      return Listing.get(transaction.listing, cb);
    },
    recommendation: function (cb) {
      if (!transaction.recommendation)
        return cb();

      return Recommendation.get(transaction.recommendation, cb);
    },
    create: [
      'validate',
      'user',
      'listing',
      'recommendation',
      (cb, results) => {
        var listing_data = {};

        var listing = (results.recommendation) ? results.listing.id : (
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
        ], function (err, res) {
          if (err)
            return cb(err);

          return cb(null, res.rows[0].id);
        });
      }],
    dates: [
      'create',
      (cb, results) => {
        if (!transaction.dates)
          return cb();

        async.map(transaction.dates, (r, cb) => {
          r.transaction = results.create;
          Idate.create(r, cb);
        }, cb);
      }
    ],
    roles: [
      'create',
      (cb, results) => {
        Transaction.addRoles(results.create, transaction.roles, cb);
      }
    ]
  }, function (err, results) {
    if (err)
      return cb(err);

    return Transaction.get(results.create, cb);
  });
};

Transaction.patch = function (transaction_id, data, cb) {
  if (!(process.domain.user.user_type == 'Agent' ||
        process.domain.user.user_type == 'Brokerage'))
    return cb(Error.Forbidden('Insufficient credentials: You are not allowed to create/edit transactions'));

  Transaction.get(transaction_id, function (err, transaction) {
      if (err)
        return cb(err);

    for (var i in data)
      transaction[i] = data[i];

    transaction.recommendation = (data.recommendation) ? data.recommendation :
      ((transaction.recommendation) ? transaction.recommendation.id : null);
    transaction.listing = (data.listing) ? data.listing :
      ((transaction.listing) ? transaction.listing.id : null);

    async.auto({
      user: function (cb) {
        return User.get(transaction.user, cb);
      },
      listing: function (cb) {
        if (!transaction.listing)
          return cb();

        return Listing.get(transaction.listing, cb);
      },
      recommendation: function (cb) {
        if (!transaction.recommendation)
          return cb();

        return Recommendation.get(transaction.recommendation, cb);
      },
      patch: [
        'user',
        'listing',
        'recommendation',
        function (cb, results) {
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
        function (cb, results) {
          return Transaction.get(transaction_id, cb);
        }]
    }, function (err, results) {
      if (err)
        return cb(err);

      return cb(null, results.get);
    });
  });
};

Transaction.get = function (transaction_id,  cb) {
  var current_user = process.domain.user;
  db.query(sql_get, [transaction_id, (current_user) ? current_user.id : null], function (err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Transaction not found'));

    var transaction = res.rows[0];

    async.parallel({
      roles: cb => {
        if (!transaction.roles)
          return cb();

        async.map(transaction.roles, (r, cb) => {
          Contact.get(r.contact, (err, contact) => {
            var role = _u.clone(r);
            role.contact = contact;
            return cb(null, role);
          });
        }, cb);
      },
      notes: cb => {
        if(!process.domain.user)
          return cb();

        return Note.get(transaction_id, process.domain.user.id, cb);
      }
    }, function (err, results) {
      if (err)
        return cb(err);

      transaction.roles = results.roles || null;
      transaction.notes = results.notes || [];

      return cb(null, transaction);
    });
  });
};

Transaction.getForUser = function (user_id, cb) {
  db.query(sql_user, [user_id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var transaction_ids = res.rows.map(function (r) {
      return r.id;
    });

    async.map(transaction_ids, Transaction.get, function (err, transactions) {
      if (err)
        return cb(err);

      return cb(null, transactions);
    });
  });
};

Transaction.delete = function (transaction_id, cb) {
  Transaction.get(transaction_id, function (err) {
    if (err)
      return cb(err);

    db.query(sql_delete, [transaction_id], function (err) {
      if (err)
        return cb(err);

      return cb();
    });
  });
};

Transaction.assign = function(transaction_id, contact_id, cb) {
  async.auto({
    transaction: cb => {
      return Transaction.get(transaction_id, cb);
    },
    contact: cb => {
      return Contact.get(contact_id, cb);
    },
    assign: [
      'transaction',
      'contact',
      (cb, results) => {
        return db.query(sql_assign, [transaction_id, contact_id], cb);
      }
    ],
    user: cb => {
      return User.get(process.domain.user.id, cb);
    },
    contact_user: [
      'contact',
      (cb, results) => {
        if(!results.contact || !results.contact.contact_user)
          return cb();

        return User.get(results.contact.contact_user, cb);
      }
    ],
    notification: [
      'transaction',
      'contact',
      'user',
      'contact_user',
      'assign',
      (cb, results) => {
        if(!results.contact_user)
          return cb();

        var notification = {};

        notification.action = 'Assigned';
        notification.subject = transaction_id;
        notification.subject_class = 'Transaction';
        notification.object = contact_id;
        notification.object_class = 'Contact';
        notification.auxiliary_subject_class = 'User';
        notification.auxiliary_subject = results.user.id;
        notification.auxiliary_object_class = 'User';
        notification.auxiliary_object = results.contact_user.id;
        notification.message = results.user.first_name + ' assigned you to transaction: ' + results.transaction.title;

        return Notification.issueForUser(notification, results.contact_user.id, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, true);
  });
};

Transaction.withdraw = function(transaction_id, contact_id, cb) {
  async.auto({
    transaction: cb => {
      return Transaction.get(transaction_id, cb);
    },
    contact: cb => {
      return Contact.get(contact_id, cb);
    },
    withdraw: [
      'transaction',
      'contact',
      (cb, results) => {
        return db.query(sql_withdraw, [transaction_id, contact_id], cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, true);
  });
};

Transaction.getTransactionContact = function (transaction_id, contact_id, cb) {
  Transaction.get(transaction_id, function (err) {
    if (err)
      return cb(err);

    Contact.get(contact_id, function (err) {
      if (err)
        return cb(err);
      db.query(sql_get_transaction_contact, [transaction_id, contact_id], function (err, res) {
        if (err)
          return cb(err);

        if (res.rows.length < 1)
          return cb(null, false);

        return cb(null, res.rows[0].id);
      });
    });
  });

};

var insert = function (transaction_id, contact_id, role, cb) {
  Transaction.getTransactionContact(transaction_id, contact_id, function (err, transaction_contact_id) {
    if (err)
      return cb(err);

    db.query(sql_add_contact_role, [transaction_contact_id, role], cb);
  });
};

Transaction.addContactRole = function (transaction_id, contact_id, roles, cb) {
  async.each(roles, insert.bind(null, transaction_id, contact_id), cb);
};

Transaction.removeContactRole = function (transaction_id, contact_id, role, cb) {
  Transaction.getTransactionContact(transaction_id, contact_id, function (err, transaction_contact_id) {
    if (err)
      return cb(err);

    db.query(sql_remove_contact_role, [transaction_contact_id, role], cb);
  });
};

Transaction.getContactRole = function (transaction_id, contact_id, cb) {
  db.query(sql_get_contact_role, [transaction_id, contact_id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var roles = res.rows.map(function (r) {
      return r.role;
    });

    return cb(null, roles);
  });
};

Transaction.getAssignees = function(transaction_id, cb) {
  Transaction.get(transaction_id, err => {
    if(err)
      return cb(err);

    db.query(sql_assignees, [transaction_id], (err, res) => {
      if(err)
        return cb(err);

      var assignee_ids = res.rows.map(r => {
        return r.id;
      });

      return cb(null, assignee_ids);
    });
  });
};

Transaction.publicize = function (model) {
  if (model.listing) Listing.publicize(model.listing);
  if (model.recommendation) Listing.publicize(model.recommendation);
  if (model.roles) model.roles.map(r => { if(r.contact) Contact.publicize(r.contact); });
  if (model.important_dates) model.important_dates.map(Idate.publicize);
  if (model.attachments) model.attachments.map(Attachment.publicize);
  if (model.user) delete model.user;

  return model;
};

Transaction.associations = {
  user: {
    optional: true,
    model: 'User'
  },

  listing: {
    optional: true,
    model: 'Listing'
  },

  recommendation: {
    optional:true,
    model: 'Recommendation',
  },

  tasks: {
    collection: true,
    model: 'Task'
  },

  important_dates: {
    collection: true,
    model: 'IDate'
  },

  attachments: {
    collection: true,
    model: 'Attachment'
  }
}

module.exports = function () {
};
