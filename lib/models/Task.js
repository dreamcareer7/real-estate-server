/**
 * @namespace Task
 */

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

var async        = require('async');
var validator    = require('../utils/validator.js');
var db           = require('../utils/db.js');
var config       = require('../config.js');
var _u           = require('underscore');
var sql_insert   = require('../sql/task/insert.sql');
var sql_patch    = require('../sql/task/patch.sql');
var sql_get      = require('../sql/task/get.sql');
var sql_user     = require('../sql/task/user.sql');
var sql_delete   = require('../sql/task/delete.sql');
var sql_assign   = require('../sql/task/assign.sql');
var sql_withdraw = require('../sql/task/withdraw.sql');

Task = {};

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

    status: {
      type: 'string',
      required: false,
      enum: ['New', 'Done', 'Later']
    },

    transaction: {
      type: 'string',
      uuid: true,
      required: 'false'
    }
  }
};

var validate = validator.bind(null, schema);

Task.create = function(task, cb) {
  async.auto({
    validate: function(cb) {
      return validate(task, cb);
    },
    user: function(cb) {
      return User.get(task.user, cb);
    },
    create: ['validate',
             'user',
             function(cb, results) {
               db.query(sql_insert, [
                 task.user,
                 task.title,
                 task.transaction,
                 task.due_date
               ], function(err, res) {
                 if(err)
                   return cb(err);

                 return cb(null, res.rows[0].id);
               });
             }]
  }, function(err, results) {
    if(err)
      return cb(err);

    return Task.get(results.create, cb);
  });
};

Task.patch = function(task_id, data, cb) {
  Task.get(task_id, function(err, task) {
    for (var i in data)
      task[i] = data[i];

    if(data.user)
      task.user = data.user;

    if(data.transaction)
      task.transaction = data.transaction;

    async.auto({
      patch: function(cb) {
        db.query(sql_patch, [
          task.title,
          task.status,
          task.transaction,
          task.due_date,
          task_id
        ], cb);
      },
      get: ['patch',
            function(cb, results) {
              return Task.get(task_id, cb);
            }]
    }, function(err, results) {
         if(err)
           return cb(err);

         return cb(null, results.get);
    });
  });
};

Task.get = function(task_id, cb) {
  db.query(sql_get, [task_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Task not found'));

    var task = res.rows[0];

    async.parallel({
      user: function(cb) {
        return User.get(task.user, cb);
      },
      transaction: function(cb) {
        if(!task.transaction)
          return cb();

        return Transaction.get(task.transaction);
      },
      contacts: function(cb) {
        if(!task.contacts)
          return cb();

        return async.map(task.contacts, Contact.get, cb);
      },
      attachments: function(cb) {
        if(!task.attachments)
          return cb();

        return async.map(task.attachments, Attachment.get, cb);
      }
    }, function(err, results) {
      if(err)
        return cb(err);

      task.user = results.user || null;
      task.transaction = results.transaction || null;
      task.attachments = results.attachments || null;

      return cb(null, task);
    });
  });
};

Task.getForUser = function(user_id, cb) {
  db.query(sql_user, [user_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var task_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(task_ids, Task.get, function(err, tasks) {
      if(err)
        return cb(err);

      return cb(null, tasks);
    });
  });
};

Task.delete = function(task_id, cb) {
  Task.get(task_id, function(err) {
    if(err)
      return cb(err);

    db.query(sql_delete, [task_id], function(err) {
      if(err)
        return cb(err);

      return cb();
    });
  });
};

Task.assign = function(task_id, contact_id, cb) {
  Task.get(task_id, function(err) {
    if(err)
      return cb(err);

    Contact.get(contact_id, function(err) {
      if(err)
        return cb(err);

      return db.query(sql_assign, [task_id, contact_id], cb);
    });
  });
};

Task.withdraw = function(task_id, contact_id, cb) {
  Task.get(task_id, function(err) {
    if(err)
      return cb(err);

    Contact.get(contact_id, function(err) {
      if(err)
        return cb(err);

      return db.query(sql_withdraw, [task_id, contact_id], cb);
    });
  });
};

Task.publicize = function(model) {
  if(model.contacts) model.contacts.map(Contact.publicize);
  if(model.user) delete model.user;

  return model;
};

module.exports = function () {};
