const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE contacts
    ADD COLUMN title text,
    ADD COLUMN first_name text,
    ADD COLUMN middle_name text,
    ADD COLUMN last_name text,
    ADD COLUMN marketing_name text,
    ADD COLUMN nickname text,
    ADD COLUMN email text[],
    ADD COLUMN phone_number text[],
    ADD COLUMN tag text[],
    ADD COLUMN website text[],
    ADD COLUMN company text,
    ADD COLUMN birthday timestamptz,
    ADD COLUMN profile_image_url text,
    ADD COLUMN cover_image_url text,
    ADD COLUMN job_title text,
    ADD COLUMN source_type text,
    ADD COLUMN source text,
    ADD COLUMN partner_first_name text,
    ADD COLUMN partner_last_name text,
    ADD COLUMN partner_email text,
    ADD COLUMN "address" stdaddr[]
  `,
  'DROP TRIGGER IF EXISTS update_contact_summaries_on_contact_update ON contacts',
  'DROP FUNCTION IF EXISTS update_contact_summaries_from_contact',
  'DROP FUNCTION IF EXISTS get_contact_summaries2(uuid[])',
  `CREATE OR REPLACE VIEW analytics.calendar AS (
    SELECT
      id,
      created_by,
      'crm_task' AS object_type,
      task_type AS event_type,
      task_type AS type_label,
      due_date AS "timestamp",
      due_date AS "date",
      due_date AS next_occurence,
      False AS recurring,
      title,
      id AS crm_task,
      NULL::uuid AS deal,
      NULL::uuid AS contact,
      NULL::uuid AS campaign,
      (
        SELECT
          ARRAY_AGG("user")
        FROM
          crm_tasks_assignees
        WHERE
          crm_task = crm_tasks.id
          AND deleted_at IS NULL
      ) AS users,
      brand,
      status,
      jsonb_build_object(
        'status', status
      ) AS metadata
    FROM
      crm_tasks
    WHERE
      deleted_at IS NULL
    )
    UNION ALL
    (
    SELECT
      ca.id,
      ca.created_by,
      'crm_association' AS object_type,
      ct.task_type AS event_type,
      ct.task_type AS type_label,
      ct.due_date AS "timestamp",
      ct.due_date AS "date",
      ct.due_date AS next_occurence,
      False AS recurring,
      ct.title,
      ct.id AS crm_task,
      ca.deal,
      ca.contact,
      ca.email AS campaign,
      (
        SELECT
          ARRAY_AGG("user")
        FROM
          crm_tasks_assignees
        WHERE
          crm_task = ct.id
          AND deleted_at IS NULL
      ) AS users,
      ct.brand,
      ct.status,
      jsonb_build_object(
        'status', ct.status
      ) AS metadata
    FROM
      crm_associations AS ca
      JOIN crm_tasks AS ct
        ON ca.crm_task = ct.id
    WHERE
      ca.deleted_at IS NULL
      AND ct.deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        cdc.id,
        deals.created_by,
        'deal_context' AS object_type,
        cdc."key" AS event_type,
        bc.label AS type_label,
        cdc."date" AS "timestamp",
        timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC' AS "date",
        cdc."date" AS next_occurence,
        False AS recurring,
        deals.title,
        NULL::uuid AS crm_task,
        cdc.deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
        (
          SELECT
            ARRAY_AGG(DISTINCT r."user")
          FROM
            deals_roles AS r
          WHERE
            r.deal = deals.id
            AND r.deleted_at IS NULL
            AND r."user" IS NOT NULL
        ) AS users,
        deals.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        current_deal_context cdc
        JOIN deals
          ON cdc.deal = deals.id
        JOIN brands_contexts bc
          ON bc.id = cdc.definition
        JOIN deals_checklists dcl
          ON dcl.id = cdc.checklist
      WHERE
        deals.deleted_at IS NULL
        AND cdc.data_type = 'Date'::context_data_type
        AND dcl.deleted_at     IS NULL
        AND dcl.deactivated_at IS NULL
        AND dcl.terminated_at  IS NULL
        AND deals.faired_at    IS NOT NULL
        AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}', cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
    )
    UNION ALL
    (
      SELECT
        ca.id,
        contacts.created_by,
        'contact_attribute' AS object_type,
        COALESCE(cad.name, cad.label) AS event_type,
        (CASE
          WHEN attribute_type = 'birthday' AND is_partner IS TRUE THEN 'Spouse Birthday'
          WHEN attribute_type = 'child_birthday' THEN COALESCE('Child Birthday (' || ca.label || ')', 'Child Birthday')
          ELSE COALESCE(cad.label, cad.name)
        END) AS type_label,
        "date" AS "timestamp",
        timezone('UTC', date_trunc('day', "date")::timestamp) AT TIME ZONE 'UTC' AS "date",
        cast("date" + ((extract(year from age("date")) + 1) * interval '1' year) as date) as next_occurence,
        True AS recurring,
        (CASE
          WHEN attribute_type = 'birthday' AND ca.is_partner IS TRUE THEN
            array_to_string(ARRAY['Spouse Birthday', '(' || contacts.partner_name || ')', '- ' || contacts.display_name], ' ')
          WHEN attribute_type = 'birthday' AND ca.is_partner IS NOT TRUE THEN
            contacts.display_name || $$'s Birthday$$
          WHEN attribute_type = 'child_birthday' AND ca.label IS NOT NULL AND LENGTH(ca.label) > 0 THEN
            array_to_string(ARRAY['Child Birthday', '(' || ca.label || ')', '- ' || contacts.display_name], ' ')
          WHEN attribute_type = 'child_birthday' AND (ca.label IS NULL OR LENGTH(ca.label) = 0) THEN
            'Child Birthday - ' || contacts.display_name
          WHEN attribute_type = ANY('{
            work_anniversary,
            wedding_anniversary,
            home_anniversary
          }'::text[]) THEN
            contacts.display_name || $$'s $$  || cad.label
          ELSE
            contacts.display_name
        END) AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        contact,
        NULL::uuid AS campaign,
        ARRAY[contacts."user"] AS users,
        contacts.brand,
        NULL::text AS status,
        jsonb_build_object(
          'is_partner', is_partner
        ) AS metadata
      FROM
        contacts
        JOIN contacts_attributes AS ca
          ON contacts.id = ca.contact
        JOIN contacts_attribute_defs AS cad
          ON ca.attribute_def = cad.id
      WHERE
        contacts.deleted_at IS NULL
        AND ca.deleted_at IS NULL
        AND cad.deleted_at IS NULL
        AND data_type = 'date'
    )
    UNION ALL
    (
      SELECT
        id,
        created_by,
        'contact' AS object_type,
        'next_touch' AS event_type,
        'Next Touch' AS type_label,
        next_touch AS "timestamp",
        next_touch AS "date",
        next_touch AS next_occurence,
        False AS recurring,
        display_name AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        id AS contact,
        NULL::uuid AS campaign,
        ARRAY[contacts."user"] AS users,
        brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        contacts
      WHERE
        deleted_at IS NULL
        AND next_touch IS NOT NULL
    )
    UNION ALL
    (
      SELECT
        id,
        created_by,
        'email_campaign' AS object_type,
        'scheduled_email' AS event_type,
        'Scheduled Email' AS type_label,
        due_at AS "timestamp",
        due_at AS "date",
        due_at AS next_occurence,
        False AS recurring,
        subject AS title,
        NULL::uuid AS crm_task,
        ec.deal,
        NULL::uuid AS contact,
        id AS campaign,
        ARRAY[ec.from] AS users,
        brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        email_campaigns AS ec
      WHERE
        deleted_at IS NULL
        AND executed_at IS NULL
        AND deleted_at IS NULL
        AND due_at IS NOT NULL
    )
    UNION ALL
    (
      SELECT
        ec.id,
        ec.created_by,
        'email_campaign_recipient' AS object_type,
        'scheduled_email' AS event_type,
        'Scheduled Email' AS type_label,
        ec.due_at AS "timestamp",
        ec.due_at AS "date",
        ec.due_at AS next_occurence,
        False AS recurring,
        ec.subject AS title,
        NULL::uuid AS crm_task,
        ec.deal,
        ecr.contact,
        ec.id AS campaign,
        ARRAY[ec.from] AS users,
        ec.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        email_campaigns AS ec
        JOIN (
          (
            SELECT
              ecr.campaign,
              clm.contact
            FROM
              email_campaigns_recipients AS ecr
              JOIN crm_lists_members AS clm
                ON ecr.list = clm.list
          )
          UNION
          (
            SELECT
              ecr.campaign,
              cs.id AS contact
            FROM
              email_campaigns_recipients AS ecr
              JOIN email_campaigns AS ec
                ON ecr.campaign = ec.id
              JOIN contacts AS cs
                ON ARRAY[ecr.tag] <@ cs.tag AND ec.brand = cs.brand
            WHERE
              ecr.tag IS NOT NULL
              AND cs.deleted_at IS NULL
          )
          UNION
          (
            SELECT
              campaign,
              contact
            FROM
              email_campaigns_recipients
            WHERE
              contact IS NOT NULL
          )
        ) AS ecr
          ON ec.id = ecr.campaign
      WHERE
        ec.deleted_at IS NULL
        AND ec.executed_at IS NULL
        AND ec.due_at IS NOT NULL
    )
  `,
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
                  array_agg(array_to_string(ARRAY[
                    array_to_string(ARRAY[
                      street_number,
                      street_prefix,
                      street_name,
                      street_suffix,
                      unit_number
                    ], ' '),
                    city,
                    "state",
                    postal_code
                  ], ', ') ORDER BY address_attrs.is_primary DESC, address_attrs.label not ilike 'Home')::text AS "value"
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
            contacts_summaries.marketing_name,
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
              array_agg(standardize_address('us_lex', 'us_gaz', 'us_rules', addr)) AS "address"
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
          "address" text[]
        ) ON cids.id = contacts_summaries.cid;
      END;
    $function$`,
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
