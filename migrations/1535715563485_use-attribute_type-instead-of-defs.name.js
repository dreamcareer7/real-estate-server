'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const get_contact_summaries = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_contact_summaries.fn.sql', 'utf-8')
const get_contact_users = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_contact_users.fn.sql', 'utf-8')
const get_deals_with_contacts = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_deals_with_contacts.fn.sql', 'utf-8')
const get_users_for_contacts = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_users_for_contacts.fn.sql', 'utf-8')
const user_has_contact_with_another = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/user_has_contact_with_another.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP FUNCTION IF EXISTS get_contact_summaries(uuid[])',
  'DROP FUNCTION IF EXISTS get_contact_users(uuid)',
  'DROP FUNCTION IF EXISTS get_deals_with_contacts(uuid, uuid[])',
  'DROP FUNCTION IF EXISTS get_users_for_contacts(uuid[])',
  'DROP FUNCTION IF EXISTS user_has_contact_with_another(uuid, uuid)',
  get_contact_summaries,
  get_contact_users,
  get_users_for_contacts,
  get_deals_with_contacts,
  user_has_contact_with_another,
  'COMMIT'
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
