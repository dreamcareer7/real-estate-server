/**
 * @namespace Task
 */

require('../utils/require_sql.js')
require('../utils/require_asc.js')
require('../utils/require_html.js')

const async = require('async')
const validator = require('../utils/validator.js')
const db = require('../utils/db.js')

Task = {}

Orm.register('task', Task)

const schema = {
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
}

const validate = validator.bind(null, schema)

Task.create = function (task, cb) {
  async.auto({
    validate: cb => {
      return validate(task, cb)
    },
    user: cb => {
      return User.get(task.user, cb)
    },
    create: ['validate',
      'user',
      function (cb, results) {
        db.query('task/insert', [
          task.user,
          task.title,
          task.transaction,
          task.due_date,
          task.private,
          task.expense,
          null
        ], function (err, res) {
          if (err)
            return cb(err)

          return cb(null, res.rows[0].id)
        })
      }],
    assignees: [
      'create',
      (cb, results) => {
        Task.getAssignees(results.create, cb)
      }],
    notification: [
      'validate',
      'user',
      'create',
      'assignees',
      (cb, results) => {
        const notification = {}

        notification.action = 'Created'
        notification.subject = task.user
        notification.subject_class = 'User'
        notification.object = results.create
        notification.object_class = 'Task'
        notification.message = results.user.first_name + ' created a task: ' + task.title

        Notification.issueForUsersExcept(notification, results.assignees, task.user, {}, cb)
      }],
    due_date: [
      'validate',
      'user',
      'create',
      'assignees',
      (cb, results) => {
        const delta = task.due_date * 1000 - (Date.now())
        if (delta <= 0 || task.status !== 'New')
          return cb()

        const notification = {}
        notification.action = 'IsDue'
        notification.subject = results.create
        notification.subject_class = 'Task'
        notification.object = null
        notification.object_class = 'User'
        notification.message = task.title + ' is due'
        notification.delay = delta > 0 ? delta : undefined

        Notification.issueForUsers(notification, results.assignees, {object: true}, cb)
      }]
  }, function (err, results) {
    if (err)
      return cb(err)

    return Task.get(results.create, cb)
  })
}

Task.patch = function (task_id, data, cb) {
  Task.get(task_id, (err, task) => {
    if(err)
      return cb(err)

    if ((data.private !== task.private) &&
        (process.domain.user.id !== task.user))
      return cb(Error.Forbidden('Insufficient credentials: Unable to change privacy setting for a task not owner by you'))

    const transaction_id = (data.transaction) ? data.transaction : (
      (task.transaction) ? task.transaction : undefined)

    for (const i in data)
      task[i] = data[i]

    task.transaction = transaction_id
    task.expense = (task.expense) ? task.expense : undefined

    async.auto({
      transaction: cb => {
        if (!transaction_id)
          return cb()

        return Transaction.get(transaction_id, cb)
      },
      validate: cb => {
        return validate(task, cb)
      },
      patch: ['transaction',
        'validate',
        (cb, results) => {
          db.query('task/patch', [
            task.title,
            task.status,
            task.transaction,
            task.due_date,
            task.private,
            task.expense,
            task_id
          ], cb)
        }
      ],
      get: ['patch',
        function (cb, results) {
          return Task.get(task_id, cb)
        }]
    }, function (err, results) {
      if (err)
        return cb(err)

      return cb(null, results.get)
    })
  })
}

Task.get = function (task_id, cb) {
  const current_user = process.domain.user

  db.query('task/get', [task_id, (current_user) ? current_user.id : null], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Task ' + task_id + 'not found'))

    const task = res.rows[0]
    cb(null, task)
  })
}

Task.getForUser = function (user_id, statuses, cb) {
  db.query('task/user', [user_id, statuses], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const task_ids = res.rows.map(function (r) {
      return r.id
    })

    async.map(task_ids, Task.get, function (err, tasks) {
      if (err)
        return cb(err)

      return cb(null, tasks)
    })
  })
}

Task.delete = function (task_id, cb) {
  Task.get(task_id, function (err, task) {
    if (err)
      return cb(err)

    db.query('task/delete', [task_id], function (err) {
      if (err)
        return cb(err)

      return cb()
    })
  })
}

Task.assign = function (user_id, task_id, contact_id, cb) {
  async.auto({
    task: cb => {
      return Task.get(task_id, cb)
    },
    contact: cb => {
      return Contact.get(contact_id, cb)
    },
    assign: [
      'task',
      'contact',
      (cb, results) => {
        return db.query('task/assign', [task_id, contact_id], cb)
      }
    ],
    user: cb => {
      return User.get(user_id, cb)
    },
    contact_user: [
      'contact',
      (cb, results) => {
        if (!results.contact || !results.contact.contact_user)
          return cb()

        return User.get(results.contact.contact_user, cb)
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
          return cb()

        const notification = {}

        notification.action = 'Assigned'
        notification.subject = task_id
        notification.subject_class = 'Task'
        notification.object = contact_id
        notification.object_class = 'Contact'
        notification.auxiliary_subject_class = 'User'
        notification.auxiliary_subject = results.user.id
        notification.auxiliary_object_class = 'User'
        notification.auxiliary_object = results.contact_user.id
        notification.message = results.user.first_name + ' assigned you to task: ' + results.task.title

        return Notification.issueForUser(notification, results.contact_user.id, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, true)
  })
}

Task.withdraw = function (task_id, contact_id, cb) {
  async.auto({
    task: cb => {
      return Task.get(task_id, cb)
    },
    contact: cb => {
      return Contact.get(contact_id, cb)
    },
    withdraw: [
      'task',
      'contact',
      (cb, results) => {
        return db.query('task/withdraw', [task_id, contact_id], cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, true)
  })
}

Task.getAssignees = function (task_id, cb) {
  Task.get(task_id, err => {
    if (err)
      return cb(err)

    db.query('task/assignees', [task_id], (err, res) => {
      if (err)
        return cb(err)

      const assignee_ids = res.rows.map(r => {
        return r.id
      })

      return cb(null, assignee_ids)
    })
  })
}

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
}
