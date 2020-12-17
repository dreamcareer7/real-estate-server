const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION get_search_field_for_contacts(contact_ids uuid[])
  RETURNS TABLE (
    contact uuid,
    search_field tsvector
  )
  LANGUAGE SQL
  STABLE
  AS $$
    WITH p1 AS (
      SELECT
        contact,
        array_to_string(array_agg(text || ' ' || CASE WHEN attribute_type = 'email' THEN split_part(text, '@', 2) ELSE '' END), ' ') as search_field
      FROM
        contacts_attributes
      WHERE
        contact = ANY(contact_ids)
        AND contacts_attributes.deleted_at IS NULL
        AND (attribute_type = 'first_name' OR attribute_type = 'last_name' OR attribute_type = 'email' OR attribute_type = 'phone_number')
        AND contacts_attributes.data_type = 'text'
        AND is_partner IS FALSE
      GROUP BY
        contact
    ), p2 AS (
      SELECT
        contact,
        array_to_string(array_agg(text), ' ') as search_field
      FROM
        contacts_attributes
      WHERE
        contact = ANY(contact_ids)
        AND contacts_attributes.deleted_at IS NULL
        AND contacts_attributes.data_type = 'text'
        AND (
          (is_partner IS TRUE AND (attribute_type = 'first_name' OR attribute_type = 'last_name' OR attribute_type = 'email' OR attribute_type = 'phone_number'))
          OR attribute_type = 'marketing_name'
          OR attribute_type = 'middle_name'
        )
      GROUP BY
        contact
    ), p3 AS (
      SELECT
        contact,
        array_to_string(array_agg(text || ' ' || CASE WHEN attribute_type = 'email' THEN split_part(text, '@', 2) ELSE '' END), ' ') as search_field
      FROM
        contacts_attributes
        JOIN contacts_attribute_defs ON contacts_attributes.attribute_def = contacts_attribute_defs.id
      WHERE
        contact = ANY(contact_ids)
        AND searchable IS True
        AND contacts_attributes.data_type = 'text'
        AND contacts_attributes.deleted_at IS NULL
        AND contacts_attribute_defs.deleted_at IS NULL
        AND attribute_type <> ALL('{
          first_name,
          middle_name,
          last_name,
          marketing_name,
          email,
          phone_number
        }')
      GROUP BY
        contact
    ), combined AS (
      SELECT
        COALESCE(p1.contact, COALESCE(p2.contact, p3.contact)) AS contact,
        (setweight(to_tsvector('simple', COALESCE(p1.search_field, '')), 'A')
        || setweight(to_tsvector('simple', COALESCE(p2.search_field, '')), 'B')
        || setweight(to_tsvector('simple', COALESCE(p3.search_field, '')), 'C')) AS search_field
      FROM
        p1
        FULL OUTER JOIN p2
          ON p1.contact = p2.contact
        FULL OUTER JOIN p3
          ON COALESCE(p1.contact, p2.contact) = p3.contact
    )
    SELECT
      cids.id,
      COALESCE(search_field, setweight(to_tsvector('simple', 'Guest'), 'D')) AS search_field
    FROM
      unnest(contact_ids) cids(id)
      LEFT JOIN combined
        ON combined.contact = cids.id
  $$`,

  `CREATE OR REPLACE FUNCTION get_contact_summaries2(contact_ids uuid[])
  RETURNS TABLE (
    id uuid,
    title text,
    first_name text,
    middle_name text,
    last_name text,
    marketing_name text,
    nickname text,
    company text,
    birthday timestamptz,
    profile_image_url text,
    cover_image_url text,
    job_title text,
    source_type text,
    source text,
    email text[],
    phone_number text[],
    tag text[],
    website text[],
    display_name text,
    sort_field text,
    partner_name text,
    partner_first_name text,
    partner_last_name text,
    partner_email text,
    "address" stdaddr[]
  )
  LANGUAGE plpgsql
  AS $function$
    DECLARE
      cid_values text;
      crosstab_sql text;
      address_ct_sql text;
    BEGIN
      cid_values := $$('$$ || array_to_string(contact_ids, $$'),('$$) || $$')$$;
  
      address_ct_sql := $$
        WITH contact_ids(id) AS ( VALUES $$ || cid_values || $$ )
        SELECT
          c.id || ':' || COALESCE(ca.index, 1) AS row_name,
          c.id,
          COALESCE(ca.index, 1) AS index,
          (sum(is_primary::int) OVER (w)) > 0 AS is_primary,
          first_value(label) OVER (w ORDER BY label NULLS LAST) AS label,
          ca.attribute_type,
          ca.text
        FROM
          contact_ids
          JOIN contacts AS c
            ON contact_ids.id::uuid = c.id
          JOIN contacts_attributes AS ca
            ON c.id = ca.contact
        WHERE
          ca.attribute_type = ANY(ARRAY[
            'country',
            'state',
            'city',
            'postal_code',
            'street_number',
            'street_name',
            'street_prefix',
            'street_suffix',
            'unit_number',
            'state'
          ])
          AND ca.deleted_at IS NULL
        WINDOW w AS (PARTITION BY (contact, index))
        ORDER BY
          2, 3, 4
      $$;
  
      crosstab_sql := $ctsql$
        WITH contact_ids(id) AS ( VALUES $ctsql$ || cid_values || $ctsql$ ),
          attrs AS (
            (
              SELECT
                contacts.id,
                contacts_attributes.attribute_type,
                COALESCE(
                  contacts_attributes.text,
                  contacts_attributes.date::text
                ) AS "value"
              FROM
                contacts
                JOIN contacts_attributes ON contacts_attributes.contact = contacts.id
                JOIN contact_ids ON contacts.id = contact_ids.id::uuid
              WHERE
                contacts_attributes.deleted_at IS NULL
                AND contacts_attributes.is_partner IS False
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
                  ('source')
                )
            )
            UNION ALL
            (
              SELECT
                contacts.id,
                contacts_attributes.attribute_type,
                array_agg(text ORDER BY contacts_attributes.is_primary desc, contacts_attributes.updated_at desc)::text AS "value"
              FROM
                contacts
                JOIN contacts_attributes ON contacts_attributes.contact = contacts.id
                JOIN contact_ids ON contacts.id = contact_ids.id::uuid
              WHERE
                contacts_attributes.deleted_at IS NULL
                AND contacts_attributes.is_partner IS False
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
            )
            UNION ALL
            (
              SELECT DISTINCT ON (
                contacts.id,
                contacts_attributes.attribute_def
              )
                contacts.id,
                'partner_' || contacts_attributes.attribute_type AS attribute_type,
                contacts_attributes.text AS "value"
              FROM
                contacts
                JOIN contacts_attributes ON contacts_attributes.contact = contacts.id
                JOIN contact_ids ON contacts.id = contact_ids.id::uuid
              WHERE
                contacts_attributes.deleted_at IS NULL
                AND contacts_attributes.is_partner IS TRUE
                AND contacts.deleted_at IS NULL
                AND attribute_type = ANY(VALUES
                  ('first_name'),
                  ('last_name'),
                  ('nickname'),
                  ('company'),
                  ('email'),
                  ('phone_number')
                )
              ORDER BY
                contacts.id,
                contacts_attributes.attribute_def,
                contacts_attributes.is_primary DESC
            )
            UNION ALL
            (
              WITH address_attrs AS (
                SELECT
                  id,
                  index,
                  is_primary,
                  label,
                  postal_code,
                  street_number,
                  street_prefix,
                  street_suffix,
                  unit_number,
                  country,
                  street_name,
                  city,
                  "state",
                  county
                FROM
                  crosstab(
                    $$ $ctsql$ || address_ct_sql || $ctsql$ $$,
                    $$
                      SELECT "name" FROM contacts_attribute_defs WHERE section = 'Addresses' AND global IS TRUE ORDER BY name
                    $$
                  ) AS addrs (
                    row_name text,
                    id uuid,
                    index smallint,
                    is_primary boolean,
                    label text,
                    city text,
                    country text,
                    county text,
                    postal_code text,
                    "state" text,
                    street_name text,
                    street_number text,
                    street_prefix text,
                    street_suffix text,
                    unit_number text
                  )
              )
              SELECT
                address_attrs.id,
                'address' AS attribute_type,
                array_agg(jsonb_build_object(
                  'building', null,
                  'house_num', street_number,
                  'predir', street_prefix,
                  'qual', null,
                  'pretype', null,
                  'name', street_name,
                  'suftype', street_suffix,
                  'sufdir', null,
                  'ruralroute', null,
                  'extra', label,
                  'city', city,
                  'state', "state",
                  'country', country,
                  'postcode', postal_code,
                  'box', null,
                  'unit', unit_number
                )::text ORDER BY address_attrs.is_primary DESC, address_attrs.label not ilike 'Home')::text AS "value"
              FROM
                address_attrs
              GROUP BY
                address_attrs.id
            )
        )
        SELECT
          id,
          attribute_type,
          "value"
        FROM
          attrs
        ORDER BY
          id,
          attribute_type
      $ctsql$;
  
      RETURN QUERY SELECT
        cids.id,
        contacts_summaries.title,
        contacts_summaries.first_name,
        contacts_summaries.middle_name,
        contacts_summaries.last_name,
        contacts_summaries.marketing_name,
        contacts_summaries.nickname,
        contacts_summaries.company,
        contacts_summaries.birthday,
        contacts_summaries.profile_image_url,
        contacts_summaries.cover_image_url,
        contacts_summaries.job_title,
        contacts_summaries.source_type,
        contacts_summaries.source,
        contacts_summaries.email,
        contacts_summaries.phone_number,
        contacts_summaries.tag,
        contacts_summaries.website,
  
        COALESCE(
          CASE WHEN contacts_summaries.first_name IS NOT NULL AND contacts_summaries.last_name IS NOT NULL THEN contacts_summaries.first_name || ' ' || contacts_summaries.last_name ELSE NULL END,
          contacts_summaries.marketing_name,
          contacts_summaries.nickname,
          contacts_summaries.first_name,
          contacts_summaries.last_name,
          contacts_summaries.company,
          contacts_summaries.email[1],
          contacts_summaries.phone_number[1],
          'Guest'
        ) AS display_name,
  
        COALESCE(
          CASE WHEN contacts_summaries.first_name IS NOT NULL AND contacts_summaries.last_name IS NOT NULL THEN contacts_summaries.last_name || ' ' || contacts_summaries.first_name ELSE NULL END,
          contacts_summaries.last_name,
          contacts_summaries.marketing_name,
          contacts_summaries.first_name,
          contacts_summaries.nickname,
          contacts_summaries.company,
          contacts_summaries.email[1],
          contacts_summaries.phone_number[1],
          'Guest'
        ) AS sort_field,
  
        COALESCE(
          CASE WHEN contacts_summaries.partner_first_name IS NOT NULL AND contacts_summaries.partner_last_name IS NOT NULL THEN contacts_summaries.partner_first_name || ' ' || contacts_summaries.partner_last_name ELSE NULL END,
          contacts_summaries.partner_nickname,
          contacts_summaries.partner_first_name,
          contacts_summaries.partner_last_name,
          contacts_summaries.partner_company,
          contacts_summaries.partner_email,
          contacts_summaries.partner_phone_number
        ) AS partner_name,
  
        contacts_summaries.partner_first_name,
        contacts_summaries.partner_last_name,
        contacts_summaries.partner_email,
  
        (
          SELECT
            array_agg(JSON_TO_STDADDR(addr)) AS "address"
          FROM
            unnest(contacts_summaries.address) AS addrs(addr)
        ) AS "address"
      FROM
        unnest(contact_ids) AS cids(id)
        LEFT JOIN crosstab(crosstab_sql, $$
        VALUES
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
          ('source'),
          ('email'),
          ('phone_number'),
          ('tag'),
          ('website'),
          ('partner_first_name'),
          ('partner_last_name'),
          ('partner_nickname'),
          ('partner_company'),
          ('partner_email'),
          ('partner_phone_number'),
          ('address')
      $$) AS contacts_summaries(
        cid uuid,
        title text,
        first_name text,
        middle_name text,
        last_name text,
        marketing_name text,
        nickname text,
        company text,
        birthday timestamptz,
        profile_image_url text,
        cover_image_url text,
        job_title text,
        source_type text,
        source text,
        email text[],
        phone_number text[],
        tag text[],
        website text[],
        partner_first_name text,
        partner_last_name text,
        partner_nickname text,
        partner_company text,
        partner_email text,
        partner_phone_number text,
        "address" jsonb[]
      ) ON cids.id = contacts_summaries.cid;
    END;
  $function$`,

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
      updated_for = 'merge'
    WHERE
      id = parent;
  
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

  `CREATE OR REPLACE FUNCTION get_contact_summaries(contact_ids uuid[])
  RETURNS TABLE (
    id uuid,
    is_partner boolean,
    title text,
    first_name text,
    middle_name text,
    last_name text,
    marketing_name text,
    nickname text,
    email text,
    phone_number text,
    company text,
    birthday double precision,
    profile_image_url text,
    cover_image_url text,
    job_title text,
    source_type text,
    source text,
    tags text[]
  )
  LANGUAGE plpgsql
  AS $function$
    DECLARE
      cid_values text;
      crosstab_sql text;
    BEGIN
      cid_values := $$('$$ || array_to_string(contact_ids, $$'),('$$) || $$')$$;
  
      crosstab_sql := $ctsql$
        WITH contact_ids(id) AS ( VALUES $ctsql$ || cid_values || $ctsql$ )
        SELECT DISTINCT ON (contacts.id, contacts_attributes.is_partner, contacts_attributes.attribute_def)
          (contacts.id || ':' || contacts_attributes.is_partner) AS row_name,
          contacts.id,
          contacts_attributes.is_partner,
          contacts_attributes.attribute_type,
          COALESCE(
            contacts_attributes.text,
            contacts_attributes.date::text
          ) AS "value"
        FROM
          contacts
          JOIN contacts_attributes ON contacts_attributes.contact = contacts.id
          JOIN contact_ids ON contacts.id = contact_ids.id::uuid
        WHERE
          (contacts_attributes.text IS NULL OR LENGTH(contacts_attributes.text) > 0)
          AND contacts_attributes.deleted_at IS NULL
          AND contacts.deleted_at IS NULL
          AND attribute_type = ANY(VALUES
            ('title'),
            ('first_name'),
            ('middle_name'),
            ('last_name'),
            ('marketing_name'),
            ('nickname'),
            ('email'),
            ('phone_number'),
            ('company'),
            ('birthday'),
            ('profile_image_url'),
            ('cover_image_url'),
            ('job_title'),
            ('source_type'),
            ('source')
          )
        ORDER BY
          contacts.id,
          contacts_attributes.is_partner,
          contacts_attributes.attribute_def,
          contacts_attributes.is_primary desc,
          contacts_attributes.updated_at desc
      $ctsql$;
  
      RETURN QUERY SELECT
        cids.id,
        contacts_summaries.is_partner,
        contacts_summaries.title,
        contacts_summaries.first_name,
        contacts_summaries.middle_name,
        contacts_summaries.last_name,
        contacts_summaries.marketing_name,
        contacts_summaries.nickname,
        contacts_summaries.email,
        contacts_summaries.phone_number,
        contacts_summaries.company,
        extract(epoch from contacts_summaries.birthday) AS birthday,
        contacts_summaries.profile_image_url,
        contacts_summaries.cover_image_url,
        contacts_summaries.job_title,
        contacts_summaries.source_type,
        contacts_summaries.source,
        ctags.tags
      FROM
        unnest(contact_ids) AS cids(id)
        LEFT JOIN (
          SELECT
            contact AS id,
            array_agg(text ORDER BY created_at) AS tags
          FROM
            contacts_attributes
          WHERE
            contacts_attributes.deleted_at IS NULL
            AND attribute_type = 'tag'
            AND contact = ANY(contact_ids)
          GROUP BY
            contact
        ) AS ctags USING (id)
        LEFT JOIN crosstab(crosstab_sql, $$
        VALUES
          ('title'),
          ('first_name'),
          ('middle_name'),
          ('last_name'),
          ('marketing_name'),
          ('nickname'),
          ('email'),
          ('phone_number'),
          ('company'),
          ('birthday'),
          ('profile_image_url'),
          ('cover_image_url'),
          ('job_title'),
          ('source_type'),
          ('source')
      $$) AS contacts_summaries(
        row_name text,
        cid uuid,
        is_partner boolean,
        title text,
        first_name text,
        middle_name text,
        last_name text,
        marketing_name text,
        nickname text,
        email text,
        phone_number text,
        company text,
        birthday timestamptz,
        profile_image_url text,
        cover_image_url text,
        job_title text,
        source_type text,
        source text
      ) ON cids.id = contacts_summaries.cid;
    END;
  $function$`,

  'COMMIT'
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
