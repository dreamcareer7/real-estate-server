'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'CREATE INDEX contacts_phone_numbers_contact ON contacts_phone_numbers(contact)',
  'CREATE INDEX contacts_phone_numbers_deleted_at ON contacts_phone_numbers(deleted_at)',
  'CREATE INDEX contacts_emails_contact ON contacts_emails(contact)',
  'CREATE INDEX contacts_emails_deleted_at ON contacts_emails(deleted_at)',
  'CREATE INDEX contacts_attributes_contact ON contacts_attributes(contact)',
  'CREATE INDEX contacts_attributes_deleted_at ON contacts_attributes(deleted_at)',
  'CREATE INDEX contacts_attributes_attribute_type ON contacts_attributes(attribute_type)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP INDEX contacts_phone_numbers_contact',
  'DROP INDEX contacts_phone_numbers_deleted_at',
  'DROP INDEX contacts_emails_contact',
  'DROP INDEX contacts_emails_deleted_at',
  'DROP INDEX contacts_attributes_contact',
  'DROP INDEX contacts_attributes_deleted_at',
  'DROP INDEX contacts_attributes_attribute_type',
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
