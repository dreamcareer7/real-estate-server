'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE attribute_data_types AS ENUM (
    'number',
    'text',
    'date'
  )`,
  `CREATE TABLE contacts_attribute_defs (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    created_by uuid REFERENCES users(id),
    name text NOT NULL,
    data_type attribute_data_types NOT NULL,
    label text NOT NULL,
    section text,
    required boolean NOT NULL,
    global boolean NOT NULL DEFAULT False,
    singular boolean NOT NULL,
    show boolean NOT NULL,
    editable boolean NOT NULL,
    "user" uuid REFERENCES users(id),
    brand uuid REFERENCES brands(id)
  )`,
  `ALTER TABLE contacts_attributes
    ADD COLUMN attribute_def uuid REFERENCES contacts_attribute_defs(id)`,
  `INSERT INTO contacts_attribute_defs
    ("name", data_type, label, section, "required", "global", "singular", "show", "editable")
  VALUES
    ('phone_number', 'text', 'Phone', 'Details', false, true, false, true, true),
    ('email', 'text', 'Email', 'Details', false, true, false, true, true),
    ('title', 'text', 'Title', 'Names', false, true, true, true, true),
    ('first_name', 'text', 'First Name', 'Names', false, true, true, true, true),
    ('middle_name', 'text', 'Middle Name', 'Names', false, true, true, true, true),
    ('last_name', 'text', 'Last Name', 'Names', false, true, true, true, true),
    ('nickname', 'text', 'Nickname', 'Names', false, true, true, true, true),
    ('birthday', 'date', 'Birthday', 'Details', false, true, true, true, true),
    ('tag', 'text', 'Tag', 'Tags', false, true, false, true, true),
    ('note', 'text', 'Note', 'Notes', false, true, false, true, true),
    ('profile_image_url', 'text', 'Profile Picture URL', 'Header', false, true, true, true, true),
    ('cover_image_url', 'text', 'Cover Image URL', 'Header', false, true, true, true, true),
    ('company', 'text', 'Company', 'Details', false, true, true, true, true),
    ('job_title', 'text', 'Job Title', 'Details', false, true, true, true, true),
    ('website', 'text', 'Website', 'Details', false, true, false, true, true),
    ('stage', 'text', 'Stage', 'Stage', false, true, false, true, true),
    ('street_name', 'text', 'Street Name', 'Addresses', false, true, false, true, true),
    ('street_number', 'text', 'Street Number', 'Addresses', false, true, false, true, true),
    ('street_prefix', 'text', 'Street Prefix', 'Addresses', false, true, false, true, true),
    ('street_suffix', 'text', 'Street suffix', 'Addresses', false, true, false, true, true),
    ('unit_number', 'text', 'Unit Number', 'Addresses', false, true, false, true, true),
    ('city', 'text', 'City', 'Addresses', false, true, false, true, true),
    ('state', 'text', 'State', 'Addresses', false, true, false, true, true),
    ('country', 'text', 'Country', 'Addresses', false, true, false, false, true),
    ('postal_code', 'text', 'Postal Code', 'Addresses', false, true, false, true, true),
    ('zip_code', 'text', 'Zip Code', 'Addresses', false, true, false, true, true),
    ('source_type', 'text', 'Original Source', 'Details', false, true, true, true, false),
    ('source_id', 'text', 'Id on source', 'Details', false, true, true, false, false),
    ('last_modified_on_source', 'date', 'Last modified on source', 'Details', false, true, true, false, false)`,
  
  `UPDATE
    contacts_attributes
  SET
    attribute_def = cad.id
  FROM
    contacts_attribute_defs as cad
  WHERE
    contacts_attributes.attribute_type = cad.name`,

  'DELETE FROM contacts_attributes WHERE attribute_def IS NULL',

  `ALTER TABLE contacts_attributes
    DROP COLUMN attribute_type,
    ALTER COLUMN attribute_def SET NOT NULL,
    ADD CONSTRAINT unique_index_for_contact_attribute_cst UNIQUE (contact, attribute_def, index)`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `ALTER TABLE contacts_attributes
    DROP CONSTRAINT unique_index_for_contact_attribute_cst,
    ADD COLUMN attribute_type text NOT NULL`,
  `UPDATE
    contacts_attributes
  SET
    attribute_type = cad.name
  FROM
    contacts_attribute_defs
  WHERE
    contacts_attributes.attribute_def = contact_attribute_defs.id`,
  'ALTER TABLE contacts_attributes DROP COLUMN attribute_def',
  'DROP TABLE contacts_attribute_defs',
  'DROP TYPE attribute_data_types',
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
