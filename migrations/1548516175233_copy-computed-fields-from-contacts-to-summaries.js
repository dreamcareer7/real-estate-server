'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION update_contact_summaries_from_contact() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
      BEGIN
        UPDATE
          contacts_summaries AS cs
        SET
          "user" = uc."user",
          brand = uc.brand,
          updated_at = uc.updated_at,
          display_name = uc.display_name,
          sort_field = uc.sort_field,
          partner_name = uc.partner_name,
          search_field = to_tsvector('english', uc.searchable_field),
          next_touch = uc.next_touch,
          last_touch = uc.last_touch
        FROM
          updated_contacts uc
        WHERE
          uc.id = cs.id
          AND uc.deleted_at IS NULL;
    
        RETURN NULL;
      END;
    $$
  `,
  `CREATE TRIGGER update_contact_summaries_on_contact_update
    AFTER UPDATE ON contacts
    REFERENCING NEW TABLE AS updated_contacts
    FOR EACH STATEMENT
    EXECUTE PROCEDURE update_contact_summaries_from_contact()
  `,
  `
    UPDATE
      contacts_summaries cs
    SET
      "user" = c."user",
      brand = c.brand,
      updated_at = c.updated_at,
      display_name = c.display_name,
      sort_field = c.sort_field,
      partner_name = c.partner_name,
      search_field = to_tsvector('english', c.searchable_field),
      next_touch = c.next_touch,
      last_touch = c.last_touch
    FROM
      contacts c
    WHERE
      cs.id = c.id
      AND c.deleted_at IS NULL
  `,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TRIGGER update_contact_summaries_on_contact_update ON contacts',
  'DROP FUNCTION update_contact_summaries_from_contact',
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
