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
           ca.contact,
           isp.index_offset,
           ca.text,
           ca.date,
           ca.index,
           ca.label,
           COALESCE(attr_primary.is_primary, FALSE) AS is_primary,
           ca.attribute_def,
           cad.data_type,
           cad.section,
           (ca.contact = parent) AS is_parent_attr
         FROM
           contacts_attributes AS ca
           JOIN contacts_attribute_defs AS cad
             ON ca.attribute_def = cad.id
           JOIN index_space AS isp
             USING (contact)
           LEFT JOIN attr_primary
             ON attr_primary.id = ca.id
         WHERE
           ca.deleted_at IS NULL
           AND cad.deleted_at IS NULL
           AND cad.singular IS FALSE
           AND ca.contact = ANY(array_prepend(parent, children))
       ),
       attrs_to_keep AS (
         (
           SELECT DISTINCT ON (attribute_def, lower(text), index)
             id, index_offset, is_primary
           FROM
             attrs
           WHERE
             data_type = 'text'
             AND section <> 'Addresses'
           ORDER BY
             attribute_def, lower(text), index, is_parent_attr desc, is_primary desc
         )
         UNION ALL
         (
           SELECT
             id, index_offset, is_primary
           FROM
             attrs
           WHERE
             data_type = 'text'
             AND section = 'Addresses'
         )
         UNION ALL
         (
           SELECT DISTINCT ON (attribute_def, date, index, label)
             id, index_offset, is_primary
           FROM
             attrs
           WHERE
             data_type = 'date'
           ORDER BY
             attribute_def, date, index, label, is_parent_attr desc, is_primary desc
         )
       )
       UPDATE
         contacts_attributes AS ca
       SET
         contact = parent,
         index = index + atk.index_offset,
         is_primary = atk.is_primary,
         updated_at = now(),
         updated_by = user_id,
         updated_within = _context,
         updated_for = 'merge'
       FROM
         attrs_to_keep AS atk
       WHERE
         ca.id = atk.id;

       /* On to the singular attributes */
       WITH attrs AS (
         SELECT
           ca.id,
           ca.attribute_def,
           ca.updated_at,
           (ca.contact = parent) AS is_parent_attr
         FROM
           contacts_attributes AS ca
           JOIN contacts_attribute_defs AS cad
             ON ca.attribute_def = cad.id
         WHERE
           ca.deleted_at IS NULL
           AND cad.deleted_at IS NULL
           AND cad.singular IS TRUE
           AND ca.contact = ANY(array_prepend(parent, children))
       ),
       attrs_to_keep AS (
         SELECT DISTINCT ON (attribute_def)
           id
         FROM
           attrs
         ORDER BY
           attribute_def, is_parent_attr desc, updated_at desc
       )
       UPDATE
         contacts_attributes AS ca
       SET
         contact = parent,
         updated_at = now(),
         updated_by = user_id,
         updated_within = _context,
         updated_for = 'merge'
       FROM
         attrs_to_keep AS atk
       WHERE
         ca.id = atk.id;

       /* Update references to children */
       UPDATE
         crm_associations
       SET
         contact = parent
       WHERE
         contact = ANY(children);

       /* Delete all edges between parent and children */
       DELETE FROM
         contacts_duplicate_pairs
       WHERE
         (a = parent AND b = ANY(children))
         OR (b = parent AND a = ANY(children))
         OR (a = ANY(children) AND b = ANY(children));

       /* Disband whole related clusters */
       DELETE FROM
         contacts_duplicate_clusters
       WHERE
         contact = ANY(children)
         OR contact = parent;

       /* Prune additional edges between the merging group and other cluster
        * members to prevent duplicate edges after updating child references
        * to parent, while maintaining old connections to the group.
        */
       WITH unidirectional AS (
         (
           SELECT
             a, b
           FROM
             contacts_duplicate_pairs
           WHERE
             b = ANY(array_prepend(parent, children))
         )
         UNION ALL
         (
           SELECT
             b AS a,
             a AS b
           FROM
             contacts_duplicate_pairs
           WHERE
             a = ANY(array_prepend(parent, children))
         )
       ), pairs_to_delete AS (
         (
           SELECT * FROM unidirectional
         )
         EXCEPT
         (
           SELECT DISTINCT ON (a)
             a, b
           FROM
             unidirectional
           ORDER BY
             a, (b = parent) DESC
         )
       )
       DELETE FROM
         contacts_duplicate_pairs
       WHERE
         (a,b) IN (SELECT LEAST(a, b) AS a, GREATEST(a, b) AS b FROM pairs_to_delete);

       /* Update left child references to parent */
       UPDATE
         contacts_duplicate_pairs
       SET
         a = LEAST(b, parent),
         b = GREATEST(b, parent)
       WHERE
         a = ANY(children);

       /* Update right child references to parent */
       UPDATE
         contacts_duplicate_pairs
       SET
         a = LEAST(a, parent),
         b = GREATEST(a, parent)
       WHERE
         b = ANY(children);

       /* Recalculate duplicate clusters for parent after reconnecting edges */
       SELECT update_duplicate_clusters_for_contacts(ARRAY[parent]);

       /* Set updated_at timestamp on parent */
       UPDATE
         contacts
       SET
         updated_at = NOW(),
         updated_by = user_id,
         updated_within = _context,
         updated_for = 'merge',
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
