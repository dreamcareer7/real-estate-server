'use strict'

const fs = require('fs')
const path = require('path')
const async = require('async')
const db = require('../lib/utils/db')

const sql_path = path.resolve(__dirname, '../lib/sql/contact/duplicate')

const compute_combinations = fs.readFileSync(path.resolve(sql_path, '../functions/compute_combinations.fn.sql'), 'utf-8')
const update_duplicate_pairs_for_brand = fs.readFileSync(path.resolve(sql_path, 'update_duplicate_pairs_for_brand.fn.sql'), 'utf-8')
const update_duplicate_pairs_for_contacts = fs.readFileSync(path.resolve(sql_path, 'update_duplicate_pairs_for_contacts.fn.sql'), 'utf-8')
const update_duplicate_clusters_for_brand = fs.readFileSync(path.resolve(sql_path, 'update_duplicate_clusters_for_brand.fn.sql'), 'utf-8')
const update_duplicate_clusters_for_contacts = fs.readFileSync(path.resolve(sql_path, 'update_duplicate_clusters_for_contacts.fn.sql'), 'utf-8')

const add_contact_duplicate_vertices = fs.readFileSync(path.resolve(sql_path, 'add_contact_duplicate_vertices.fn.sql'), 'utf-8')
const update_contact_duplicate_vertices = fs.readFileSync(path.resolve(sql_path, 'update_contact_duplicate_vertices.fn.sql'), 'utf-8')
const remove_contact_duplicate_vertices = fs.readFileSync(path.resolve(sql_path, 'remove_contact_duplicate_vertices.fn.sql'), 'utf-8')

const up = [
  'BEGIN',
  compute_combinations,
  'DROP FUNCTION IF EXISTS update_duplicate_pairs_for_brand(uuid)',
  update_duplicate_pairs_for_brand,
  'DROP FUNCTION IF EXISTS update_duplicate_pairs_for_contacts(uuid, uuid[])',
  update_duplicate_pairs_for_contacts,
  'DROP FUNCTION IF EXISTS update_duplicate_clusters_for_brand(uuid)',
  update_duplicate_clusters_for_brand,
  'DROP FUNCTION IF EXISTS update_duplicate_clusters_for_contacts(uuid[])',
  update_duplicate_clusters_for_contacts,
  'DROP FUNCTION IF EXISTS add_contact_duplicate_vertices(uuid, uuid[])',
  add_contact_duplicate_vertices,
  'DROP FUNCTION IF EXISTS update_contact_duplicate_vertices(uuid, uuid[])',
  update_contact_duplicate_vertices,
  'DROP FUNCTION IF EXISTS remove_contact_duplicate_vertices(uuid[])',
  remove_contact_duplicate_vertices,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION add_contact_duplicate_vertices(uuid, uuid[])',
  'DROP FUNCTION update_contact_duplicate_vertices(uuid, uuid[])',
  'DROP FUNCTION remove_contact_duplicate_vertices(uuid[])',
  'DROP FUNCTION update_duplicate_clusters_for_contacts(uuid[])',
  'DROP FUNCTION update_duplicate_clusters_for_brand(uuid)',
  'DROP FUNCTION update_duplicate_pairs_for_contacts(uuid, uuid[])',
  'DROP FUNCTION update_duplicate_pairs_for_brand(uuid)',
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
