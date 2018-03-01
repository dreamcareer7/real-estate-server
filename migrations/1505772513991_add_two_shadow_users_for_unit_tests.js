'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `INSERT INTO users(
     first_name, last_name, email, phone_number, password,
     email_confirmed, phone_confirmed,
     secondary_password,
     is_shadow, fake_email
   ) VALUES (
     'test', 'email', 'test+email@rechat.com', null, '$2a$06$GltDLemGFHZqPEiXDcQ8y.WTd63qHPn44Mcm9xdpgRAXMthiosXjK',
     false, false,
     md5('1'),
     true, false
   )`,
  `INSERT INTO users(
     first_name, last_name, email, phone_number, password,
     email_confirmed, phone_confirmed,
     secondary_password,
     is_shadow, fake_email
   ) VALUES (
     'test', 'phone', 'guest+foobarbaz@rechat.com', '+989028202677', '$2a$06$GltDLemGFHZqPEiXDcQ8y.WTd63qHPn44Mcm9xdpgRAXMthiosXjK',
     false, false,
     md5('1'),
     true, true
   )`,
  'COMMIT'
]

const down = [
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
