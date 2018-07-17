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
      'Warm List',
      'Hot List',
      'Past Client'
    ]
  WHERE
    name = 'stage'
  `,
  `UPDATE
    contacts_attributes
  SET
    text = 'Warm List'
  WHERE
    (text = 'Warm')
    AND attribute_type = 'stage'
  `,
  `UPDATE
    contacts_attributes
  SET
    text = 'Hot List'
  WHERE
    text = 'Hot'
    AND attribute_type = 'stage'
  `,
  'COMMIT'
]

const down = [
  'BEGIN',
  'UNDO SOMETHING',
  'UNDO SOMETHING ELSE',
  'UNDO EVEN MORE',
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
