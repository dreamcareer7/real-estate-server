'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP TABLE IF EXISTS contacts_summaries',
  `CREATE TABLE contacts_summaries (
    id uuid PRIMARY KEY,
    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid REFERENCES users (id),
    "user" uuid REFERENCES users (id),
    display_name text,
    sort_field text,
    search_field tsvector,
    next_touch timestamptz,
    last_touch timestamptz,
  
    title text,
    first_name text,
    middle_name text,
    last_name text,
    marketing_name text,
    nickname text,
    email text[],
    phone_number text[],
    tag text[],
    website text[],
    company text,
    birthday timestamptz,
    profile_image_url text,
    cover_image_url text,
    job_title text,
    source_type text,
    stage text,
    source text
  )`,

  `WITH ct AS (
    SELECT
      *
    FROM crosstab($$
      SELECT * FROM (
      (
        SELECT
          contacts.id,
          contacts_attributes.attribute_type,
          COALESCE(
            contacts_attributes.text,
            contacts_attributes.number::text,
            contacts_attributes.date::text
          ) AS "value"
        FROM
          contacts
          JOIN contacts_attributes ON contacts_attributes.contact = contacts.id
        WHERE
          contacts_attributes.deleted_at IS NULL
          AND contacts.deleted_at IS NULL
          AND attribute_type = ANY(VALUES
            ('title'),
            ('first_name'),
            ('middle_name'),
            ('last_name'),
            ('marketing_name'),
            ('nickname'),
            ('company'),
            ('birthday'),
            ('profile_image_url'),
            ('cover_image_url'),
            ('job_title'),
            ('source_type'),
            ('stage'),
            ('source')
          )
      )
      UNION ALL
      (
        SELECT
          contacts.id,
          contacts_attributes.attribute_type,
          array_agg(text)::text
        FROM
          contacts
          JOIN contacts_attributes ON contacts_attributes.contact = contacts.id
        WHERE
          contacts_attributes.deleted_at IS NULL
          AND contacts.deleted_at IS NULL
          AND attribute_type = ANY(VALUES
            ('email'),
            ('phone_number'),
            ('tag'),
            ('website')
          )
        GROUP BY
          contacts.id,
          contacts_attributes.attribute_type
      )) AS t
      ORDER BY
        t.id,
        t.attribute_type
    $$, $$ VALUES
      ('title'),
      ('first_name'),
      ('middle_name'),
      ('last_name'),
      ('marketing_name'),
      ('nickname'),
      ('email'),
      ('phone_number'),
      ('tag'),
      ('website'),
      ('company'),
      ('birthday'),
      ('profile_image_url'),
      ('cover_image_url'),
      ('job_title'),
      ('source_type'),
      ('stage'),
      ('source')
    $$) AS contacts_summaries(
      id uuid,
      title text,
      first_name text,
      middle_name text,
      last_name text,
      marketing_name text,
      nickname text,
      email text[],
      phone_number text[],
      tag text[],
      website text[],
      company text,
      birthday timestamptz,
      profile_image_url text,
      cover_image_url text,
      job_title text,
      source_type text,
      stage text,
      source text
    )
  )
  INSERT INTO
    contacts_summaries
    (
      id,
      created_by,
      "user",
      display_name,
      search_field,
      next_touch,
      last_touch,
      title,
      first_name,
      middle_name,
      last_name,
      marketing_name,
      nickname,
      email,
      phone_number,
      tag,
      website,
      company,
      birthday,
      profile_image_url,
      cover_image_url,
      job_title,
      source_type,
      stage,
      source
    )
  SELECT
    c.id,
    c.created_by,
    c."user",
    c.display_name,
    to_tsvector('english', c.searchable_field),
    c.next_touch,
    c.last_touch,
    ct.title,
    ct.first_name,
    ct.middle_name,
    ct.last_name,
    ct.marketing_name,
    ct.nickname,
    ct.email,
    ct.phone_number,
    ct.tag,
    ct.website,
    ct.company,
    ct.birthday,
    ct.profile_image_url,
    ct.cover_image_url,
    ct.job_title,
    ct.source_type,
    ct.stage,
    ct.source
  FROM
    ct JOIN contacts AS c USING (id)`,

  'CREATE INDEX IF NOT EXISTS contacts_summaries_user_idx ON contacts_summaries USING hash ("user")',
  'CREATE INDEX IF NOT EXISTS contacts_summaries_tag_idx ON contacts_summaries USING GIN (tag)',
  'CREATE INDEX IF NOT EXISTS contacts_summaries_source_type_idx ON contacts_summaries (source_type)',
  'CREATE INDEX IF NOT EXISTS contacts_summaries_stage_idx ON contacts_summaries (stage)',
  'CREATE INDEX IF NOT EXISTS contacts_summaries_search_field_idx ON contacts_summaries USING GIN (search_field)',

  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE contacts_summaries',
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
