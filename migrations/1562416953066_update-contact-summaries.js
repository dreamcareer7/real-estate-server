const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP FUNCTION IF EXISTS get_contact_summaries2(uuid[])',

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
              'street_suffix',
              'unit_number',
              'state'
            ])
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
                    contacts_attributes.number::text,
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
  `CREATE OR REPLACE FUNCTION STDADDR_TO_JSON(input stdaddr)
    RETURNS JSON AS $$
      SELECT JSON_STRIP_NULLS(
        JSON_BUILD_OBJECT(
          'building',   INITCAP(NULLIF(($1).building, '')),
          'house_num',  INITCAP(NULLIF(($1).house_num, '')),
          'predir',     INITCAP(NULLIF(($1).predir, '')),
          'qual',       INITCAP(NULLIF(($1).qual, '')),
          'pretype',    INITCAP(NULLIF(($1).pretype, '')),
          'name',       INITCAP(NULLIF(($1).name, '')),
          'suftype',    INITCAP(NULLIF(($1).suftype, '')),
          'sufdir',     INITCAP(NULLIF(($1).sufdir, '')),
          'ruralroute', INITCAP(NULLIF(($1).ruralroute, '')),
          'extra',      INITCAP(NULLIF(($1).extra, '')),
          'city',       INITCAP(NULLIF(($1).city, '')),
          'state',      UPPER(NULLIF(($1).state, '')),
          'country',    NULLIF(($1).country, ''), -- USA -> Usa ?
          'postcode',   INITCAP(NULLIF(($1).postcode, '')),
          'box',        INITCAP(NULLIF(($1).box, '')),
          'unit',       (NULLIF(REPLACE(($1).unit, '# ', '#'), '')),
    
          'line1', (
            SELECT ARRAY_TO_STRING
              (
                ARRAY[
                  INITCAP(NULLIF(($1).building, '')),
                  INITCAP(NULLIF(($1).house_num, '')),
                  INITCAP(NULLIF(($1).predir, '')),
                  INITCAP(NULLIF(($1).qual, '')),
                  INITCAP(NULLIF(($1).pretype, '')),
                  INITCAP(NULLIF(($1).name, '')),
                  INITCAP(NULLIF(($1).suftype, '')),
                  INITCAP(NULLIF(($1).sufdir, '')),
                  INITCAP(NULLIF(($1).ruralroute, '')),
                  CASE
                    WHEN ($1).unit IS NULL THEN NULL
                    WHEN ($1).unit = '' THEN NULL
                    ELSE 'Unit ' || (REPLACE(($1).unit, '# ', '#'))
                  END,
                  CASE
                    WHEN ($1).box IS NULL THEN NULL
                    WHEN ($1).box = '' THEN NULL
                    ELSE 'Box ' || INITCAP(($1).box)
                  END
                ], ' ', NULL
              )
          ),
    
          'line2', (
            SELECT ARRAY_TO_STRING
              (
                ARRAY[
                  INITCAP(NULLIF(($1).city, '')),
                  UPPER(NULLIF(($1).state, '')),
                  INITCAP(NULLIF(($1).postcode, ''))
                ], ' ', NULL
              )
          ),
    
          'full', (
            SELECT ARRAY_TO_STRING
              (
                ARRAY[
                  INITCAP(NULLIF(($1).building, '')),
                  INITCAP(NULLIF(($1).house_num, '')),
                  INITCAP(NULLIF(($1).predir, '')),
                  INITCAP(NULLIF(($1).qual, '')),
                  INITCAP(NULLIF(($1).pretype, '')),
                  INITCAP(NULLIF(($1).name, '')),
                  INITCAP(NULLIF(($1).suftype, '')),
                  INITCAP(NULLIF(($1).sufdir, '')),
                  INITCAP(NULLIF(($1).ruralroute, '')),
                  CASE
                    WHEN ($1).unit IS NULL THEN NULL
                    WHEN ($1).unit = '' THEN NULL
                    ELSE 'Unit ' || (REPLACE(($1).unit, '# ', '#')) || ','
                  END,
                  CASE
                    WHEN ($1).box IS NULL THEN NULL
                    WHEN ($1).box = '' THEN NULL
                    ELSE 'Box ' || INITCAP(($1).box)
                  END,
                  INITCAP(NULLIF(($1).city, '')),
                  UPPER(NULLIF(($1).state, '')),
                  INITCAP(NULLIF(($1).postcode, ''))
                ], ' ', NULL
              )
          )
        )
      )
    $$
    LANGUAGE SQL`,
  `CREATE OR REPLACE FUNCTION update_contact_summaries_for_brand(brand_id uuid)
    RETURNS void
    LANGUAGE SQL
    AS $$
      WITH cids AS (
          SELECT array_agg(id) AS ids FROM contacts WHERE brand = brand_id
      ), cs AS (
      SELECT
          c.id,
          ct.title,
          ct.first_name,
          ct.partner_first_name,
          ct.middle_name,
          ct.last_name,
          ct.partner_last_name,
          ct.marketing_name,
          ct.nickname,
          ct.email,
          ct.partner_email,
          ct.phone_number,
          ct.tag,
          ct.website,
          ct.company,
          ct.birthday,
          ct.profile_image_url,
          ct.cover_image_url,
          ct.job_title,
          ct.source_type,
          ct.source,
          ct.display_name,
          ct.partner_name,
          ct.sort_field,
          ct.address,
          csf.search_field
      FROM
          cids,
          unnest(cids.ids) c(id)
          JOIN get_contact_summaries2(cids.ids) AS ct
              ON ct.id = c.id
          JOIN get_search_field_for_contacts(cids.ids) csf
              ON c.id = csf.contact
      )
      UPDATE
      contacts
      SET
      title = cs.title,
      first_name = cs.first_name,
      partner_first_name = cs.partner_first_name,
      middle_name = cs.middle_name,
      last_name = cs.last_name,
      partner_last_name = cs.partner_last_name,
      marketing_name = cs.marketing_name,
      nickname = cs.nickname,
      email = cs.email,
      partner_email = cs.partner_email,
      phone_number = cs.phone_number,
      tag = cs.tag,
      website = cs.website,
      company = cs.company,
      birthday = cs.birthday,
      profile_image_url = cs.profile_image_url,
      cover_image_url = cs.cover_image_url,
      job_title = cs.job_title,
      source_type = cs.source_type,
      source = cs.source,
      "address" = cs.address,
  
      search_field = cs.search_field,
      display_name = cs.display_name,
      partner_name = cs.partner_name,
      sort_field = cs.sort_field
      FROM
      cs
      WHERE
      cs.id = contacts.id
  $$`,
  'SELECT brands.id FROM brands, update_contact_summaries_for_brand(brands.id)',
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
