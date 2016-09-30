'use strict'

const async = require('async')

const db = require('../lib/utils/db')

const sqls = [
  'ALTER TABLE raw_listings RENAME TO mls_data',
  'ALTER TABLE mls_data RENAME listing  TO value',
  'ALTER TABLE mls_data ADD class varchar',
  'ALTER TABLE mls_data ADD resource varchar',
  'ALTER TABLE mls_data ADD matrix_unique_id integer',
  'ALTER TABLE mls_data ADD CONSTRAINT matrix_unique_id UNIQUE (matrix_unique_id)',
  'ALTER TABLE ntreis_jobs ADD class varchar',
  'ALTER TABLE ntreis_jobs ADD resource varchar',
  'UPDATE ntreis_jobs SET class = \'Listing\', resource = \'Property\'',
  'ALTER TABLE ntreis_jobs RENAME TO mls_jobs'
]

const runAll = (next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

exports.up = runAll

exports.down = () => {} // Hard to downgrade this change.
