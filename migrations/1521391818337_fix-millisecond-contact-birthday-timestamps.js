'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `UPDATE
    contacts_attributes
  SET
    attribute = jsonb_set(
      attribute,
      '{birthday}',
      to_jsonb(jsonb_extract_path_text(attribute, 'birthday')::float / 1000)
    )
  WHERE
    attribute_type = 'birthday'
    and jsonb_extract_path_text(attribute, 'birthday')::float > extract(epoch from now())`
]

const down = []

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
