'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE agents ALTER COLUMN email DROP NOT NULL;',
  'UPDATE agents SET email = CASE WHEN LENGTH(email) = 0 THEN NULL ELSE email END, \
fax = CASE WHEN LENGTH(fax) = 0 THEN NULL ELSE fax END, \
full_name = CASE WHEN LENGTH(full_name) = 0 THEN NULL ELSE full_name END, \
first_name = CASE WHEN LENGTH(first_name) = 0 THEN NULL ELSE first_name END, \
last_name = CASE WHEN LENGTH(last_name) = 0 THEN NULL ELSE last_name END, \
middle_name = CASE WHEN LENGTH(middle_name) = 0 THEN NULL ELSE middle_name END, \
phone_number = CASE WHEN LENGTH(phone_number) = 0 THEN NULL ELSE phone_number END, \
nar_number = CASE WHEN LENGTH(nar_number) = 0 THEN NULL ELSE nar_number END, \
work_phone = CASE WHEN LENGTH(work_phone) = 0 THEN NULL ELSE work_phone END, \
generational_name = CASE WHEN LENGTH(generational_name) = 0 THEN NULL ELSE generational_name END;'
]

const down = [
  'ALTER TABLE agents ALTER COLUMN email SET NOT NULL;'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
