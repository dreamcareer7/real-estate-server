/**
 * @namespace Task
 */

require('../utils/require_sql.js');
require('../utils/require_asc.js');
require('../utils/require_html.js');

var google = require('googleapis');
var googleAuth = require('google-auth-library');
var async = require('async');
var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var _u = require('underscore');
var moment = require('moment');
var sql_insert = require('../sql/task/insert.sql');
var sql_patch = require('../sql/task/patch.sql');
var sql_get = require('../sql/task/get.sql');
var sql_get_by_google_id = require('../sql/task/get_by_google_id.sql');
var sql_user = require('../sql/task/user.sql');
var sql_delete = require('../sql/task/delete.sql');
var sql_delete_by_google_id = require('../sql/task/delete_by_google_id.sql');
var sql_assign = require('../sql/task/assign.sql');
var sql_withdraw = require('../sql/task/withdraw.sql');
var sql_assignees = require('../sql/task/assignees.sql');
var sql_set_google_id = require('../sql/task/set_google_id.sql');
var sql_update_by_google_id = require('../sql/task/update_by_google_id.sql');


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
    },

    contact: {
      type: 'string',
      uuid: true,
      required: 'false'
    },

    due_date: {
      type: 'number',
      required: false
    },

    private: {
      type: 'boolean',
      required: true
    },

    expense: {
      type: 'number',
      required: false
    }
  }
};

var validate = validator.bind(null, schema);

Task.create = function (task, cb) {
  async.auto({
    validate: cb => {
      return validate(task, cb);
    },
    user: cb => {
      return User.get(task.user, cb);
    },
    create: ['validate',
      'user',
      function (cb, results) {
        db.query(sql_insert, [
          task.user,
          task.title,
          task.transaction,
          task.due_date,
          task.private,
          task.expense,
          null
        ], function (err, res) {
          if (err)
            return cb(err);

          return cb(null, res.rows[0].id);
        });
      }],
    addToCalendar: [
      'create',
      (cb, results) => {
        Task.addToCalendar(task.user, results.create, Task.toCalendarEvent(task), function (err, event) {
          return cb(null, event);
        });
      }],
    assignees: [
      'addToCalendar',
      (cb, results) => {
        return Task.getAssignees(results.create, cb);
      }],
    notification: [
      'validate',
      'user',
      'create',
      'assignees',
      (cb, results) => {
        var notification = {};

        notification.action = 'Created';
        notification.subject = task.user;
        notification.subject_class = 'User';
        notification.object = results.create;
        notification.object_class = 'Task';
        notification.message = results.user.first_name + ' created a task: ' + task.title;

        Notification.issueForUsersExcept(notification, results.assignees, task.user, {}, cb);
      }],
    due_date: [
      'validate',
      'user',
      'create',
      'assignees',
      (cb, results) => {
        var delta = task.due_date * 1000 - (Date.now());
        if (delta <= 0 || task.status != 'New')
          return cb();

        var notification = {};
        notification.action = 'IsDue';
        notification.subject = results.create;
        notification.subject_class = 'Task';
        notification.object = null;
        notification.object_class = 'User';
        notification.message = task.title + ' is due';
        notification.delay = delta > 0 ? delta : undefined;

        Notification.issueForUsers(notification, results.assignees, {object: true}, cb);
      }]
  }, function (err, results) {
    if (err)
      return cb(err);

    return Task.get(results.create, cb);
  });
};

Task.patch = function (task_id, data, cb) {
  Task.get(task_id, function (err, task) {
    if ((data.private != task.private) &&
      (process.domain.user.id != task.user))

      return cb(Error.Forbidden('Insufficient credentials: Unable to change privacy setting for a task not owner by you'));

    var transaction_id = (data.transaction) ? data.transaction : (
      (task.transaction) ? task.transaction : undefined);

    for (var i in data)
      task[i] = data[i];

    task.transaction = transaction_id;
    task.expense = (task.expense) ? task.expense : undefined;

    async.auto({
      transaction: cb => {
        if (!transaction_id)
          return cb();

        return Transaction.get(transaction_id, cb);
      },
      validate: cb => {
        return validate(task, cb);
      },
      patch: ['transaction',
        'validate',
        (cb, results) => {
          db.query(sql_patch, [
            task.title,
            task.status,
            task.transaction,
            task.due_date,
            task.private,
            task.expense,
            task_id
          ], cb);
        }
      ],
      updateInCalendar: [
        'patch',
        (cb, results) => {
          Task.updateInCalendar(task.id, Task.toCalendarEvent(task), function (err, event) {
            return cb(null, event);
          });
        }],
      get: ['patch',
        function (cb, results) {
          return Task.get(task_id, cb);
        }]
    }, function (err, results) {
      if (err)
        return cb(err);

      return cb(null, results.get);
    });
  });
};

Task.get = function (task_id, cb) {
  var current_user = process.domain.user;

  db.query(sql_get, [task_id, (current_user) ? current_user.id : null], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Task not found'));

    var task = res.rows[0];
    cb(null, task);
  });
};

Task.getForUser = function (user_id, statuses, cb) {
  db.query(sql_user, [user_id, statuses], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var task_ids = res.rows.map(function (r) {
      return r.id;
    });

    async.map(task_ids, Task.get, function (err, tasks) {
      if (err)
        return cb(err);

      return cb(null, tasks);
    });
  });
};

Task.delete = function (task_id, cb) {
  Task.get(task_id, function (err, task) {
    if (err)
      return cb(err);

    db.query(sql_delete, [task_id], function (err) {
      if (err)
        return cb(err);

      if (task.google_id) {
        Task.deleteFromCalendar(task_id, cb);
      } else {
        return cb();
      }
    });
  });
};

Task.deleteByGoogleId = function (google_id, cb) {
  db.query(sql_delete_by_google_id, [google_id], function (err) {
    if (err)
      return cb(err);
  });
};

Task.assign = function (user_id, task_id, contact_id, cb) {
  async.auto({
    task: cb => {
      return Task.get(task_id, cb);
    },
    contact: cb => {
      return Contact.get(contact_id, cb);
    },
    assign: [
      'task',
      'contact',
      (cb, results) => {
        return db.query(sql_assign, [task_id, contact_id], cb);
      }
    ],
    user: cb => {
      return User.get(user_id, cb);
    },
    contact_user: [
      'contact',
      (cb, results) => {
        if (!results.contact || !results.contact.contact_user)
          return cb();

        return User.get(results.contact.contact_user, cb);
      }
    ],
    notification: [
      'task',
      'contact',
      'user',
      'contact_user',
      'assign',
      (cb, results) => {
        if (!results.contact_user)
          return cb();

        var notification = {};

        notification.action = 'Assigned';
        notification.subject = task_id;
        notification.subject_class = 'Task';
        notification.object = contact_id;
        notification.object_class = 'Contact';
        notification.auxiliary_subject_class = 'User';
        notification.auxiliary_subject = results.user.id;
        notification.auxiliary_object_class = 'User';
        notification.auxiliary_object = results.contact_user.id;
        notification.message = results.user.first_name + ' assigned you to task: ' + results.task.title;

        return Notification.issueForUser(notification, results.contact_user.id, cb);
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err);

    return cb(null, true);
  });
};

Task.withdraw = function (task_id, contact_id, cb) {
  async.auto({
    task: cb => {
      return Task.get(task_id, cb);
    },
    contact: cb => {
      return Contact.get(contact_id, cb);
    },
    withdraw: [
      'task',
      'contact',
      (cb, results) => {
        return db.query(sql_withdraw, [task_id, contact_id], cb);
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err);

    return cb(null, true);
  });
};

Task.getAssignees = function (task_id, cb) {
  Task.get(task_id, err => {
    if (err)
      return cb(err);

    db.query(sql_assignees, [task_id], (err, res) => {
      if (err)
        return cb(err);

      var assignee_ids = res.rows.map(r => {
        return r.id;
      });

      return cb(null, assignee_ids);
    });
  });
};

Task.fetchGoogleEvents = function (user_id, last_sync_id, cb) {
  Google.createOauthForUser(user_id, function (err, auth) {
    if (err) {
      return cb(err);
    }
    var calendar = google.calendar('v3');
    var criteria = {
      auth: auth,
      calendarId: auth.calendar_id,
      singleEvents: true,
      syncToken: last_sync_id
    };

    calendar.events.list(criteria, function (err, response) {
      if (err) {
        return cb(err);
      }
      Google.updateSyncToken(user_id, response.nextSyncToken, function (err, result) {
        if (err) {
          return cb(err);
        }
        if (last_sync_id == null) {
          return cb(null, response);
        }
        async.forEach(res, processEvent, cb);
      });
    });
  });
};


var processEvent = function (event, cb) {
  switch (event.status) {
    case 'cancelled':
      Task.deleteByGoogleId(event.id, cb);
      break;
    case 'confirmed':
      Task.createOrUpdateFromCalendar(user_id, event.summary, event.start.dateTime ? event.start.dateTime : event.start.date, response.items[i].id, cb);
      break;
    default:
      return cb();
  }
};

Task.addToCalendar = function (user_id, task_id, event, cb) {
  Google.getByUser(user_id, function (err, token) {
    if (err) {
      return cb(err);
    } else {
      Google.createOauthForUser(user_id, function (err, auth) {
        if (err) {
          return cb(err);
        } else {
          var calendar = google.calendar('v3');
          calendar.events.insert({
            auth: auth,
            calendarId: token.calendar_id,
            sendNotifications: true,
            resource: event,
          }, function (err, event) {
            if (err) {
              return cb(err);
            } else {
              db.query(sql_set_google_id, [
                task_id,
                event.id
              ], cb);
            }
          });
        }
      });
    }
  });
};

Task.deleteFromCalendar = function (task_id, cb) {
  Task.get(task_id, function (err, task) {
    if (err) {
      return cb(err)
    } else {
      if (task.google_id) {
        Google.getByUser(task.user, function (err, token) {
          if (err) {
            return cb(err);
          } else {
            var calendar = google.calendar('v3');

            Google.createOauthForUser(task.user, function (err, auth) {
              if (err) {
                return cb(err);
              } else {
                calendar.events.delete({
                  auth: auth,
                  calendarId: token.calendar_id,
                  eventId: task.google_id,
                }, cb);
              }
            });
          }
        });
      }
    }
  });
};

Task.updateInCalendar = function (task_id, event, cb) {
  Task.get(task_id, function (err, task) {
    if (err) {
      return cb(err)
    } else {
      if (task.google_id) {
        Google.getByUser(task.user, function (err, token) {
          if (err) {
            return cb(err);
          } else {
            var calendar = google.calendar('v3');
            Google.createOauthForUser(task.user, function (err, auth) {
              if (err) {
                return cb(err);
              } else {
                calendar.events.patch({
                  auth: auth,
                  calendarId: token.calendar_id,
                  eventId: task.google_id,
                  resource: event
                }, cb);
              }
            });
          }
        });
      } else {
        return cb();
      }
    }
  });
};

Task.toCalendarEvent = function (task) {
  return {
    'summary': task.title,
    'start': {
      'dateTime': moment.unix(task.due_date).toISOString(),
    },
    'end': {
      'dateTime': moment.unix(task.due_date).toISOString(),
    },
    'reminders': {
      'useDefault': false,
      'overrides': [
        {'method': 'email', 'minutes': 24 * 60},
        {'method': 'popup', 'minutes': 10},
      ],
    },
  }
};

Task.createOrUpdateFromCalendar = function (user_id, title, due_date, google_id, cb) {
  db.query(sql_get_by_google_id, [google_id], function (err, res) {
    if (err) {
      return cb(err);
    }

    if (res.rows.length > 0) {
      db.query(sql_update_by_google_id, [title, due_date, google_id], function (err, res) {
        if (err)
          return cb(err);
      });
    } else {
      db.query(sql_insert, [user_id, title, null, moment(due_date).unix(), false, null, google_id], function (err, res) {
        if (err)
          return cb(err);
      });
    }
  });
};

Task.associations = {
  user: {
    model: 'User'
  },

  contacts: {
    collection: true,
    model: 'Contact'
  },

  attachments: {
    collection: true,
    model: 'Attachment'
  }
}

module.exports = function () {
};
