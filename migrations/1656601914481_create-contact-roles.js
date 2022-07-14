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
       SELECT contact.brand = curr_brand OR (
         curr_user IS NOT NULL AND EXISTS(
           SELECT 1
           FROM contact_roles AS cr
           WHERE
             cr.brand = curr_brand AND
             cr."user" = curr_user AND
             deleted_at IS NULL AND
             role IN ('assignee', 'owner')
         )
       )
     $$`,

  `CREATE OR REPLACE FUNCTION public.check_contact_write_access(
     contact contacts,
     curr_brand uuid,
     curr_user uuid
   ) RETURNS boolean
     LANGUAGE sql
     IMMUTABLE AS $$
       SELECT contact.brand = curr_brand OR (
         curr_user IS NOT NULL AND EXISTS(
           SELECT 1
           FROM contact_roles AS cr
           WHERE
             cr.brand = curr_brand AND
             cr."user" = curr_user AND
             deleted_at IS NULL AND
             role IN ('assignee', 'owner')
         )
       )
     $$`,

  `CREATE OR REPLACE FUNCTION public.check_contact_delete_access(contact contacts, brand uuid)
     RETURNS boolean
     LANGUAGE sql
     IMMUTABLE AS $$
       SELECT contact.brand = brand
     $$`,

  `CREATE OR REPLACE FUNCTION merge_contacts(parent uuid, children uuid[], user_id uuid, _context text)
     RETURNS setof uuid
     LANGUAGE SQL
     AS $$
       /* Take care of non-singular attributes first */
       WITH max_indices AS (
         SELECT
           contact,
           (contact = parent) AS is_parent,
           MAX(index) AS max_index,
           MIN(index) AS min_index
         FROM
           contacts_attributes
         WHERE
           contact = ANY(array_prepend(parent, children))
           AND deleted_at IS NULL
         GROUP BY
           contact
       ),
       index_space AS (
         SELECT
           contact,
           CASE
             WHEN is_parent IS TRUE THEN
               0
             ELSE
               SUM(max_index) OVER (w) - max_index - SUM(min_index) OVER (w) + first_value(min_index) OVER (w) + row_number() OVER (w) - 1
           END AS index_offset
         FROM
           max_indices
         WINDOW w AS (ORDER BY is_parent DESC, contact)
       ),
       attr_primary AS (
         SELECT DISTINCT ON (attribute_def)
           id,
           attribute_type,
           is_primary
         FROM
           contacts_attributes
         WHERE
           contact = ANY(array_prepend(parent, children))
           AND deleted_at IS NULL
           AND is_primary IS TRUE
         ORDER BY
           attribute_def,
           (contact = parent) desc,
           is_primary desc
       ),
       attrs AS (
         SELECT
           ca.id,
           ca.contacoted_for = 'merge',
         parked = false
       WHERE
         id = parent;

       INSERT INTO contact_roles (
         contact,
         role,
         created_by,
         brand,
         "user"
       )
       SELECT
         cr.contact,
         cr.role,
         cr.created_by,
         cr.brand,
         cr."user"
       FROM unnest(children) AS child_id
       JOIN contact_roles AS cr ON cr.contact = child_id
       WHERE cr.deleted_at IS NULL
       ON CONFLICT DO NOTHING;

       /* Delete child contacts */
       UPDATE
         contacts
       SET
         deleted_at = NOW(),
         deleted_by = user_id,
         deleted_within = _context,
         deleted_for = 'merge'
       WHERE
         id = ANY(children)
         AND deleted_at IS NULL
       RETURNING
         id;
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
