'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    name = 'postal_code'
  WHERE
    name = 'zip_code'`,

  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Contact Info'
  WHERE
    section = 'Details'`,

  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Names'
  WHERE
    name = 'job_title' OR name = 'company'`,

  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Details'
  WHERE
    section = 'Names'`,

  'COMMIT'
]

const down = [
  'BEGIN',

  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Names'
  WHERE
    section = 'Details'`,

  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Details'
  WHERE
    section = 'Contact Info'`,

  `UPDATE
    contacts_attribute_defs
  SET
    name = 'postal_code'
  WHERE
    name = 'zip_code'`,

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
