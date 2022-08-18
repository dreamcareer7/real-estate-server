CREATE OR REPLACE FUNCTION get_contact_summaries2(contact_ids uuid[])
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
        AND ca.data_type = 'text'
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
        contacts_summaries.nickname,
        contacts_summaries.marketing_name,
        CASE WHEN contacts_summaries.first_name IS NOT NULL AND contacts_summaries.last_name IS NOT NULL THEN contacts_summaries.first_name || ' ' || contacts_summaries.last_name ELSE NULL END,
        contacts_summaries.first_name,
        contacts_summaries.last_name,
        contacts_summaries.company,
        contacts_summaries.email[1],
        contacts_summaries.phone_number[1],
        'Guest'
      ) AS display_name,

      COALESCE(
        contacts_summaries.nickname,
        CASE WHEN contacts_summaries.first_name IS NOT NULL AND contacts_summaries.last_name IS NOT NULL THEN contacts_summaries.last_name || ' ' || contacts_summaries.first_name ELSE NULL END,
        contacts_summaries.last_name,
        contacts_summaries.marketing_name,
        contacts_summaries.first_name,
        contacts_summaries.company,
        contacts_summaries.email[1],
        contacts_summaries.phone_number[1],
        'Guest'
      ) AS sort_field,

      COALESCE(
        contacts_summaries.partner_nickname,
        CASE WHEN contacts_summaries.partner_first_name IS NOT NULL AND contacts_summaries.partner_last_name IS NOT NULL THEN contacts_summaries.partner_first_name || ' ' || contacts_summaries.partner_last_name ELSE NULL END,
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
$function$
