'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP TABLE IF EXISTS contacts_duplicate_clusters',
  `CREATE TABLE contacts_duplicate_clusters (
    contact uuid REFERENCES contacts(id),
    cluster int,
    PRIMARY KEY (contact, cluster)
  )`,
  'CREATE INDEX IF NOT EXISTS contacts_duplicate_clusters_contact_idx ON contacts_duplicate_clusters (contact)',
  'CREATE INDEX IF NOT EXISTS contacts_duplicate_clusters_cluster_idx ON contacts_duplicate_clusters (cluster)',
  'DROP SEQUENCE IF EXISTS contact_duplicate_cluster_seq',
  'CREATE SEQUENCE contact_duplicate_cluster_seq',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP SEQUENCE IF EXISTS contact_duplicate_cluster_seq',
  'DROP TABLE IF EXISTS contacts_duplicate_clusters',
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
