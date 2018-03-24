'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `UPDATE contacts_attributes
    SET attribute = json_build_object(
      'title', coalesce(attribute->>'title', attribute->>'legal_prefix'),
      'first_name', coalesce(attribute->>'first_name', attribute->>'legal_first_name'),
      'middle_name', coalesce(attribute->>'middle_name', attribute->>'legal_middle_name'),
      'last_name', coalesce(attribute->>'last_name', attribute->>'legal_last_name'),
      'nickname', attribute->>'nickname'
    )
  WHERE attribute_type = 'name'`
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
