'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE listings ADD list_date timestamptz',
  'UPDATE listings SET list_date = (SELECT CASE WHEN LENGTH((value->>\'ListingContractDate\')) < 1  THEN NULL  ELSE  (value->>\'ListingContractDate\')::timestamptz END FROM mls_data WHERE matrix_unique_id = listings.matrix_unique_id)',
  'ALTER TABLE properties ADD building_square_meters double precision',
  'UPDATE properties SET building_square_meters = (SELECT CASE WHEN LENGTH((value->>\'SQFTBuilding\')) < 1 THEN NULL ELSE  (value->>\'SQFTBuilding\')::double precision END FROM mls_data WHERE matrix_unique_id = properties.matrix_unique_id)'
]

const down = [
  'ALTER TABLE listings DROP list_date',
  'ALTER TABLE properties DROP building_square_meters'
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
