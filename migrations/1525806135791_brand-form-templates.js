'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE brands_forms_templates (
    id uuid DEFAULT public.uuid_generate_v1() NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    brand uuid NOT NULL REFERENCES brands(id),
    form uuid NOT NULL REFERENCES forms(id),
    submission uuid NOT NULL REFERENCES forms_submissions(id)
  )`,
  `ALTER TABLE brands_forms_templates
    ADD CONSTRAINT brands_forms_templates_brand_form UNIQUE(brand, form, submission)`,
  'COMMIT'
]

const down = [
  'DROP TABLE brands_forms_templates'
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
