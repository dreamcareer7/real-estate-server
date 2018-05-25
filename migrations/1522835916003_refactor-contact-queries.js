'use strict'

const async = require('async')
const fs = require('fs')
const path = require('path')
const db = require('../lib/utils/db')

const sql_path = path.resolve(__dirname, '../lib/sql/contact')
const get_contact_users = fs.readFileSync(sql_path + '/functions/get_contact_users.fn.sql', 'utf-8')
const get_deals_with_contact = fs.readFileSync(sql_path + '/functions/get_deals_with_contact.fn.sql', 'utf-8')
const user_has_contact_with_another = fs.readFileSync(sql_path + '/functions/user_has_contact_with_another.fn.sql', 'utf-8')
const contacts_attributes_with_name = fs.readFileSync(sql_path + '/views/contacts_attributes_with_name.view.sql', 'utf-8')
const joined_contacts = fs.readFileSync(sql_path + '/views/joined_contacts.view.sql', 'utf-8')
const propose_brand_agents = fs.readFileSync(__dirname + '/../lib/sql/brand/propose_brand_agents.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  joined_contacts,
  contacts_attributes_with_name,
  user_has_contact_with_another,
  propose_brand_agents,
  'DROP FUNCTION get_contact_users(uuid)',
  get_contact_users,
  get_deals_with_contact,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION get_deals_with_contact(uuid, uuid)',
  'DROP FUNCTION get_contact_users(uuid)',
  'DROP FUNCTION user_has_contact_with_another(uuid, uuid)',
  'DROP VIEW contacts_attributes_with_name',
  'DROP VIEW joined_contacts',
  'COMMIT'
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
