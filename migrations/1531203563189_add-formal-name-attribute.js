'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `INSERT INTO contacts_attribute_defs
    (name, data_type, label, section, required, global, singular, show, editable, searchable)
  VALUES
    ('formal_name', 'text', 'Formal Name', 'Details', false, true, true, true, true, true)`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DELETE FROM contacts_attribute_defs WHERE name = \'formal_name\'',
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
