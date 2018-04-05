'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const fn_delete_crm_association_by_deal = fs.readFileSync(__dirname + '/../lib/sql/crm/associations/triggers/delete_crm_association_by_deal.fn.sql', 'utf-8')
const fn_delete_crm_association_by_contact = fs.readFileSync(__dirname + '/../lib/sql/crm/associations/triggers/delete_crm_association_by_contact.fn.sql', 'utf-8')
const trigger_delete_crm_association_after_delete_deal = fs.readFileSync(__dirname + '/../lib/sql/crm/associations/triggers/delete_crm_association_after_delete_deal.trigger.sql', 'utf-8')
const trigger_delete_crm_association_after_delete_contact = fs.readFileSync(__dirname + '/../lib/sql/crm/associations/triggers/delete_crm_association_after_delete_contact.trigger.sql', 'utf-8')

const up = [
  'BEGIN',
  fn_delete_crm_association_by_deal,
  fn_delete_crm_association_by_contact,
  trigger_delete_crm_association_after_delete_deal,
  trigger_delete_crm_association_after_delete_contact,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TRIGGER delete_crm_association_after_delete_deal ON crm_associations',
  'DROP TRIGGER delete_crm_association_after_delete_contact ON crm_associations',
  'DROP FUNCTION delete_crm_association_by_deal',
  'DROP FUNCTION delete_crm_association_by_contact',
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
