'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE contacts ADD FOREIGN KEY("user") REFERENCES users(id);',
  'CREATE TABLE contacts_attributes (\
    id uuid DEFAULT uuid_generate_v1() NOT NULL,\
    contact uuid NOT NULL REFERENCES contacts(id),\
    attribute_type text NOT NULL,\
    attribute jsonb,\
    created_at timestamp with time zone DEFAULT now(),\
    updated_at timestamp with time zone DEFAULT now(),\
    deleted_at timestamp with time zone\
  )',
  'CREATE TABLE contacts_emails (\
    id uuid DEFAULT uuid_generate_v1() NOT NULL,\
    contact uuid NOT NULL REFERENCES contacts(id),\
    email text,\
    data jsonb,\
    created_at timestamp with time zone DEFAULT now(),\
    updated_at timestamp with time zone DEFAULT now(),\
    deleted_at timestamp with time zone\
  )',
  'CREATE TABLE contacts_phone_numbers (\
    id uuid DEFAULT uuid_generate_v1() NOT NULL,\
    contact uuid NOT NULL REFERENCES contacts(id),\
    phone_number text,\
    data jsonb,\
    created_at timestamp with time zone DEFAULT now(),\
    updated_at timestamp with time zone DEFAULT now(),\
    deleted_at timestamp with time zone\
  )',
  'CREATE INDEX contacts_emails_email_idx ON contacts_emails USING btree (email)',
  'CREATE INDEX contacts_phone_numbers_phone_number_idx ON contacts_phone_numbers USING btree (phone_number)',
  'ALTER TABLE contacts ADD refs uuid[]',
  'ALTER TABLE contacts ADD merged boolean DEFAULT false NOT NULL',
  'UPDATE contacts SET refs = ARRAY[contacts.id::uuid]::uuid[]',

  'INSERT INTO contacts_emails(contact, email) SELECT id, email FROM contacts WHERE email IS NOT NULL',
  'INSERT INTO contacts_phone_numbers(contact, phone_number) SELECT id, phone_number FROM contacts WHERE phone_number IS NOT NULL',

  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT id, \'name\', JSONB_BUILD_OBJECT(\'first_name\', first_name, \'last_name\', last_name)\
   FROM contacts\
   WHERE first_name IS NOT NULL OR last_name IS NOT NULL',

  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT id, \'birthday\', JSONB_BUILD_OBJECT(\'birthday\', birthday)\
   FROM contacts\
   WHERE birthday IS NOT NULL',

  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT id, \'company\', JSONB_BUILD_OBJECT(\'company\', company)\
   FROM contacts\
   WHERE company IS NOT NULL',

  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT id, \'profile_image_url\', JSONB_BUILD_OBJECT(\'profile_image_url\', profile_image_url)\
   FROM contacts\
   WHERE profile_image_url IS NOT NULL',

  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT id, \'cover_image_url\', JSONB_BUILD_OBJECT(\'cover_image_url\', cover_image_url)\
   FROM contacts\
   WHERE cover_image_url IS NOT NULL',

  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT id, \'source_type\', JSONB_BUILD_OBJECT(\'source_type\', source_type)\
   FROM contacts\
   WHERE source_type IS NOT NULL',

  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT id, \'brand\', JSONB_BUILD_OBJECT(\'brand\', brand)\
   FROM contacts\
   WHERE brand IS NOT NULL',

  'INSERT INTO contacts_attributes (contact, attribute_type, attribute)\
   SELECT id, \'address\', address\
   FROM contacts\
   WHERE address IS NOT NULL',

  'ALTER TABLE contacts DROP COLUMN first_name',
  'ALTER TABLE contacts DROP COLUMN last_name',
  'ALTER TABLE contacts DROP COLUMN email',
  'ALTER TABLE contacts DROP COLUMN phone_number',
  'ALTER TABLE contacts DROP COLUMN profile_image_url',
  'ALTER TABLE contacts DROP COLUMN cover_image_url',
  'ALTER TABLE contacts DROP COLUMN invitation_url',
  'ALTER TABLE contacts DROP COLUMN company',
  'ALTER TABLE contacts DROP COLUMN address',
  'ALTER TABLE contacts DROP COLUMN birthday',
  'ALTER TABLE contacts DROP COLUMN source_type',
  'ALTER TABLE contacts DROP COLUMN brand'
]

const down = [
  ''
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
