const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TYPE contact_role AS ENUM (
     'owner',
     'assignee'
   )`,

  `CREATE TABLE contact_roles (
     id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     brand uuid NOT NULL REFERENCES brands(id),
     contact uuid NOT NULL REFERENCES contacts(id),
     "user" uuid NOT NULL REFERENCES users(id),
     role contact_role NOT NULL,

     created_at timestamp NOT NULL DEFAULT clock_timestamp(),
     updated_at timestamp DEFAULT clock_timestamp(),
     deleted_at timestamp,
     created_by uuid REFERENCES users (id),

     CONSTRAINT brand_contact_user_role_uniq UNIQUE (
       brand,
       contact,
       "user",
       role
     )
   )`,

  `CREATE OR REPLACE FUNCTION public.check_contact_read_access(
     contact contacts,
     curr_brand uuid,
     curr_user uuid
   ) RETURNS boolean
     LANGUAGE sql
     IMMUTABLE AS $$
       SELECT contact.brand = curr_brand OR EXISTS(
            SELECT 1
            FROM contact_roles AS cr
            WHERE
              cr.brand = curr_brand AND
              cr."user" = curr_user AND
              deleted_at IS NULL AND
              role IN ('assignee', 'owner')
       )
     $$`,

  `CREATE OR REPLACE FUNCTION public.check_contact_write_access(
     contact contacts,
     curr_brand uuid,
     curr_user uuid
   ) RETURNS boolean
     LANGUAGE sql
     IMMUTABLE AS $$
       SELECT contact.brand = curr_brand OR EXISTS(
            SELECT 1
            FROM contact_roles AS cr
            WHERE
              cr.brand = curr_brand AND
              cr."user" = curr_user AND
              deleted_at IS NULL AND
              role IN ('assignee', 'owner')
       )
     $$`,

  `CREATE OR REPLACE FUNCTION public.check_contact_delete_access(contact contacts, brand uuid)
     RETURNS boolean
     LANGUAGE sql
     IMMUTABLE AS $$
       SELECT contact.brand = brand
     $$`,

  'COMMIT',
]

const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
