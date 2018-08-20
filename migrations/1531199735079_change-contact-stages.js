'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    enum_values = ARRAY[
      'General',
      'Warm',
      'Hot',
      'Past Client'
    ]
  WHERE
    name = 'stage'
  `,
  `UPDATE
    contacts_attribute_defs
  SET
    enum_values = ARRAY[
      'Mr.',
      'Mr. & Mrs.',
      'Mrs.',
      'Miss',
      'Dr.',
      'Dr. & Mrs.',
      'Rev.',
      'Rev. & Mrs.',
      'Hon.',
      'Hon. & Mrs.',
      'Sir',
      'Sir & Mrs.'
    ]
  WHERE
    name = 'title'
  `,
  `UPDATE
    contacts_attributes
  SET
    text = 'Warm'
  WHERE
    (text = 'Unqualified Lead' OR text = 'Qualified Lead')
    AND attribute_type = 'stage'
  `,
  `UPDATE
    contacts_attributes
  SET
    text = 'Hot'
  WHERE
    text = 'Active'
    AND attribute_type = 'stage'
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
