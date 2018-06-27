'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Contact Info'
  WHERE
    section = 'Details'
  `,
  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Details'
  WHERE
    section = 'Names'
  `,
  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Details'
  WHERE
    name = 'company' OR name = 'job_title' OR name = 'stage'
  `,
  `UPDATE
    contacts_attribute_defs
  SET
    section = 'Dates'
  WHERE
    name = 'birthday' OR name = 'important_date'
  `,
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
