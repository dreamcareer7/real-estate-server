'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `ALTER TABLE contacts
    ADD COLUMN created_by uuid REFERENCES users(id),
    ADD COLUMN brand uuid REFERENCES brands(id),
    ADD COLUMN parent uuid REFERENCES contacts(id),
    DROP COLUMN refs,
    DROP COLUMN merged,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL`,

  `UPDATE
    contacts
  SET
    created_by = "user"`,

  `ALTER TABLE contacts
    ALTER COLUMN created_by SET NOT NULL`,

  `ALTER TABLE contacts_attributes
    ADD COLUMN "index" int2,
    ADD COLUMN "text" text,
    ADD COLUMN "date" timestamptz,
    ADD COLUMN "number" double precision,
    ADD COLUMN created_by uuid REFERENCES users(id)`,

  `UPDATE
    contacts_attributes
  SET
    "text" = attribute->>attribute_type
  WHERE
    attribute_type NOT IN ('name', 'address', 'birthday', 'last_modified_on_source')`,

  `INSERT INTO contacts_attributes
    (contact, "text", created_at, updated_at, deleted_at, label, is_primary, attribute_type)
  SELECT
    contact,
    email,
    created_at,
    updated_at,
    deleted_at,
    label,
    is_primary,
    'email' AS attribute_type
  FROM
    contacts_emails`,

  `INSERT INTO contacts_attributes
    (contact, "text", created_at, updated_at, deleted_at, label, is_primary, attribute_type)
  SELECT
    contact,
    phone_number,
    created_at,
    updated_at,
    deleted_at,
    label,
    is_primary,
    'phone_number' AS attribute_type
  FROM
    contacts_phone_numbers`,

  `UPDATE contacts_attributes
    SET "date" = to_timestamp((attribute->>attribute_type)::float / 1000)
  WHERE
    (
      (attribute->>attribute_type)::float > extract(epoch from now())
      OR
      (attribute->>attribute_type)::float < extract(epoch from timestamptz '1900-01-01')
    )
    AND (attribute_type = 'birthday' OR attribute_type = 'last_modified_on_source')`,

  `UPDATE contacts_attributes
    SET "date" = to_timestamp((attribute->>attribute_type)::float)
  WHERE
    (attribute_type = 'birthday' OR attribute_type = 'last_modified_on_source')
    AND (attribute->>attribute_type)::float <= extract(epoch from now())
    AND (attribute->>attribute_type)::float >= extract(epoch from timestamptz '1900-01-01')
    AND deleted_at IS NULL`,

  `UPDATE contacts_attributes
    SET index = uv.ord
    FROM (
      WITH ua AS (
        SELECT array_agg(id) as attrs
        FROM contacts_attributes
        GROUP BY contact, attribute_type
      )
      SELECT cid, ord FROM ua, unnest(ua.attrs) WITH ORDINALITY t(cid, ord)
    ) AS uv
    WHERE
      contacts_attributes.id = uv.cid`,

  `INSERT INTO contacts_attributes
    (contact, "text", created_at, updated_at, deleted_at, label, index, is_primary, attribute_type)
  SELECT
    contact,
    names.value,
    created_at,
    updated_at,
    deleted_at,
    label,
    index,
    is_primary,
    names.key
  FROM
    contacts_attributes,
    jsonb_each_text(attribute) as names
  WHERE
    attribute_type = 'name'
    AND names.key IN ('first_name', 'middle_name', 'last_name', 'title', 'nickname')
    AND char_length(names.value) > 0`,

  `INSERT INTO contacts_attributes
    (contact, "text", created_at, updated_at, deleted_at, label, index, is_primary, attribute_type)
  SELECT
    contact,
    addresses.value,
    created_at,
    updated_at,
    deleted_at,
    label,
    index,
    is_primary,
    addresses.key
  FROM
    contacts_attributes,
    jsonb_each_text(attribute) as addresses
  WHERE
    attribute_type = 'address'
    AND addresses.key IN (
      'state',
      'city',
      'postal_code',
      'country',
      'zip_code',
      'street_name',
      'street_number',
      'street_prefix',
      'street_suffix',
      'unit_number'
    )
    AND char_length(addresses.value) > 0`,

  `UPDATE
    contacts_attributes
  SET
    attribute_type = 'postal_code'
  WHERE
    attribute_type = 'zip_code'`,

  `DELETE FROM contacts_attributes
    WHERE attribute_type IN ('name', 'address')`,

  'DROP TABLE contacts_emails',
  'DROP TABLE contacts_phone_numbers',

  `UPDATE
    contacts_attributes
  SET
    created_by = contacts."user"
  FROM
    contacts
  WHERE
    contacts_attributes.contact = contacts.id`,

  `ALTER TABLE contacts_attributes
    DROP COLUMN attribute,
    ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL`,

  'COMMIT'
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
