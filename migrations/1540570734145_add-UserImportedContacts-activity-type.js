'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TYPE activity_type ADD VALUE IF NOT EXISTS \'UserImportedContacts\'',
  'ALTER TYPE activity_type ADD VALUE IF NOT EXISTS \'UserCreatedContactList\'',
  'ALTER TYPE notification_object_class ADD VALUE IF NOT EXISTS \'ContactList\'',
]

const down = [
]

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      next(err)
    })
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
