'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT entity, \'tag\', JSONB_BUILD_OBJECT(\'tag\', tag)\
   FROM tags\
   WHERE type = \'Contact\'',
  'DROP TABLE IF EXISTS tags'
]

const down = [
  'DELETE FROM contacts_attributes WHERE attribute_type = \'tag\'',
  'CREATE TABLE tags(\
    id uuid NOT NULL DEFAULT uuid_generate_v4(),\
    entity uuid NOT NULL,\
    tag text NOT NULL,\
    type tag_types NOT NULL,\
    "user" uuid NOT NULL REFERENCES users(id),\
    created_at timestamptz DEFAULT NOW(),\
    updated_at timestamptz,\
    deleted_at timestamptz,\
  ',
  'ALTER TABLE tags ADD UNIQUE(entity, tag, type, "user");'
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
