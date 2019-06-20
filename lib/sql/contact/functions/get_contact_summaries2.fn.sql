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
  website text[]
)
LANGUAGE plpgsql
AS $function$
  DECLARE
    cid_values text;
    crosstab_sql text;
  BEGIN
    cid_values := $$('$$ || array_to_string(contact_ids, $$'),('$$) || $$')$$;

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
        CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name ELSE NULL END,
        marketing_name,
        nickname,
        first_name,
        last_name,
        company,
        email,
        phone_number,
        'Guest'
      ) AS display_name,

      COALESCE(
        CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN last_name || ' ' || first_name ELSE NULL END,
        last_name,
        marketing_name,
        first_name,
        nickname,
        company,
        email,
        phone_number,
        'Guest'
      ) AS sort_field,

      COALESCE(
        CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name ELSE NULL END,
        marketing_name,
        partner_nickname,
        partner_first_name,
        partner_last_name,
        partner_company,
        partner_email,
        partner_phone_number
      ) AS partner_name
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
        ('partner_phone_number')
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
      partner_phone_number text
    ) ON cids.id = contacts_summaries.cid;
  END;
$function$
