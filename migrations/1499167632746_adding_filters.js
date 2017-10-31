'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const listings_filters = fs.readFileSync('./lib/sql/alert/listings_filters.mv.sql').toString()

const up = [
  'ALTER TABLE alerts ADD number_of_pets_allowed smallint',
  'ALTER TABLE alerts ADD application_fee boolean',
  'ALTER TABLE alerts ADD appliances boolean',
  'ALTER TABLE alerts ADD furnished boolean',
  'ALTER TABLE alerts ADD fenced_yard boolean',

  'ALTER TABLE listings ADD application_fee_yn boolean',
  'ALTER TABLE properties ADD furnished_yn boolean',
  'ALTER TABLE properties ADD fenced_yard_yn boolean',

  'UPDATE listings SET application_fee_yn = (SELECT CASE WHEN LENGTH((value->>\'ApplicationFeeYN\')) < 1 THEN NULL ELSE (value->>\'ApplicationFeeYN\')::boolean END FROM mls_data WHERE matrix_unique_id = listings.matrix_unique_id)',
  'UPDATE properties SET number_of_pets_allowed = (SELECT CASE WHEN LENGTH((value->>\'NumberOfPetsAllowed\')) < 1 THEN NULL ELSE (value->>\'NumberOfPetsAllowed\')::smallint END FROM mls_data WHERE matrix_unique_id = properties.matrix_unique_id)',
  'UPDATE properties SET pets_yn = (SELECT CASE WHEN LENGTH((value->>\'PetsYN\')) < 1 THEN NULL ELSE (value->>\'PetsYN\')::boolean END FROM mls_data WHERE matrix_unique_id = properties.matrix_unique_id)',
  'UPDATE properties SET appliances_yn = (SELECT CASE WHEN LENGTH((value->>\'AppliancesYN\')) < 1 THEN NULL ELSE (value->>\'AppliancesYN\')::boolean END FROM mls_data WHERE matrix_unique_id = properties.matrix_unique_id)',
  'UPDATE properties SET furnished_yn = (SELECT CASE WHEN LENGTH((value->>\'FurnishedYN\')) < 1 THEN NULL ELSE (value->>\'FurnishedYN\')::boolean END FROM mls_data WHERE matrix_unique_id = properties.matrix_unique_id)',
  'UPDATE properties SET fenced_yard_yn = (SELECT CASE WHEN LENGTH((value->>\'FencedYardYN\')) < 1 THEN NULL ELSE (value->>\'FencedYardYN\')::boolean END FROM mls_data WHERE matrix_unique_id = properties.matrix_unique_id)',

  'DROP MATERIALIZED VIEW listings_filters',
  listings_filters
]

const down = [
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
