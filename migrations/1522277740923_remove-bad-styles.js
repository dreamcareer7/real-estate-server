'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `UPDATE alerts SET architectural_styles = NULL WHERE architectural_styles = '{Southwestern,Ranch,Spanish,A-Frame,"Mid-Centry Modern",Prairie,"Studio Apartment",Contemporary/Modern,"Split Level",Victorian,Traditional,Mediterranean,Colonial,Oriental,Loft,French,Tudor}'`
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
