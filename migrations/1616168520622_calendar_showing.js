const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP VIEW IF EXISTS triggers_due',
  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP VIEW IF EXISTS calendar.activity',
  'DROP VIEW IF EXISTS calendar.contact',
  'DROP VIEW IF EXISTS calendar.contact_attribute',
  'DROP VIEW IF EXISTS calendar.crm_association',
  'DROP VIEW IF EXISTS calendar.crm_task',
  'DROP VIEW IF EXISTS calendar.deal_context',
  'DROP VIEW IF EXISTS calendar.email_campaign_email_executed',
  'DROP VIEW IF EXISTS calendar.email_campaign_executed',
  'DROP VIEW IF EXISTS calendar.email_campaign_scheduled',
  'DROP VIEW IF EXISTS calendar.email_thread',
  'DROP VIEW IF EXISTS calendar.email_thread_recipient',
  'DROP VIEW IF EXISTS calendar.flow',
  'DROP VIEW IF EXISTS calendar.home_anniversary',
  'DROP VIEW IF EXISTS calendar.showing',

  `CREATE OR REPLACE VIEW calendar.activity AS (
    SELECT
      a.id::text,
      a.created_by,
      a.created_at,
      a.updated_at,
      a.deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(a.created_at, a.updated_at, a.deleted_at) AS last_updated_at,
      'activity' AS object_type,
      "action"::text AS event_type,
      "action"::text AS type_label,
      a.created_at AS "timestamp",
      (timezone('UTC', date_trunc('day', a.created_at)::timestamp) AT TIME ZONE 'UTC')::date AS "date",
      cast(a.created_at + ((extract(year from age(a.created_at)) + 1) * interval '1' year) as date) as next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      "action"::text AS title,
      NULL::uuid AS crm_task,
      FALSE as all_day,
      NULL::uuid AS deal,
      contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      a.id AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      ARRAY[contacts."user"] AS users,
      NULL::uuid[] AS accessible_to,
      ARRAY[json_build_object('id', contact, 'type', 'contact')]::json[] AS people,
      1 AS people_len,
      contacts.brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      contacts
      JOIN contacts_users AS cu
        ON contacts.id = cu.contact
      JOIN users AS u
        ON cu."user" = u.id
      JOIN activities AS a
        ON a.reference = u.id AND a.reference_type = 'User'
    WHERE
      contacts.deleted_at IS NULL
      AND contacts.parked IS NOT TRUE
      AND u.is_shadow IS NOT TRUE
      AND u.deleted_at IS NULL
      AND u.user_type = 'Client'
      AND a.deleted_at IS NULL
  )`,
  `CREATE OR REPLACE VIEW calendar.contact AS (
    SELECT
      id::text,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'contact' AS object_type,
      'next_touch' AS event_type,
      'Next Touch' AS type_label,
      next_touch AS "timestamp",
      next_touch::date AS "date",
      next_touch AS next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      'Touch reminder: ' || display_name AS title,
      NULL::uuid AS crm_task,
      TRUE as all_day,
      NULL::uuid AS deal,
      id AS contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      ARRAY[contacts."user"] AS users,
      NULL::uuid[] AS accessible_to,
      ARRAY[json_build_object('id', id, 'type', 'contact')]::json[] AS people,
      1 AS people_len,
      brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      contacts
    WHERE
      deleted_at IS NULL
      AND next_touch IS NOT NULL
      AND parked IS NOT TRUE
  )`,
  `CREATE OR REPLACE VIEW calendar.contact_attribute AS (
    SELECT
      ca.id::text,
      ca.created_by,
      ca.created_at,
      ca.updated_at,
      ca.deleted_at,
      contacts.deleted_at AS parent_deleted_at,
      GREATEST(ca.created_at, ca.updated_at, LEAST(contacts.deleted_at, ca.deleted_at)) AS last_updated_at,
      'contact_attribute' AS object_type,
      COALESCE(cad.name, cad.label) AS event_type,
      (CASE
        WHEN attribute_type = 'birthday' AND is_partner IS TRUE THEN 'Spouse Birthday'
        WHEN attribute_type = 'child_birthday' THEN COALESCE('Child Birthday (' || ca.label || ')', 'Child Birthday')
        ELSE COALESCE(cad.label, cad.name)
      END) AS type_label,
      "date"::timestamptz AS "timestamp",
      "date",
      "date"::timestamptz + ((extract(year from age("date")) + (CASE WHEN "date" > now() THEN 0 ELSE 1 END)) * interval '1' year) as next_occurence,
      NULL::timestamptz AS end_date,
      True AS recurring,
      (CASE
        WHEN attribute_type = 'birthday' AND ca.is_partner IS TRUE THEN
          array_to_string(ARRAY[contacts.display_name || $$'s Spouse's Birthday$$, '(' || contacts.partner_name || ')'], ' ')
        WHEN attribute_type = 'birthday' AND ca.is_partner IS NOT TRUE THEN
          contacts.display_name || $$'s Birthday$$
        WHEN attribute_type = 'child_birthday' AND ca.label IS NOT NULL AND LENGTH(ca.label) > 0 THEN
          array_to_string(ARRAY[contacts.display_name || $$'s$$, $$Child's Birthday$$, '(' || ca.label || ')'], ' ')
        WHEN attribute_type = 'child_birthday' AND (ca.label IS NULL OR LENGTH(ca.label) = 0) THEN
          contacts.display_name || $$'s Child's Birthday$$
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
      TRUE as all_day,
      NULL::uuid AS deal,
      contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      ARRAY[contacts."user"] AS users,
      NULL::uuid[] AS accessible_to,
      ARRAY[json_build_object('id', contact, 'type', 'contact')]::json[] AS people,
      1 AS people_len,
      contacts.brand,
      NULL::text AS status,
      jsonb_build_object(
        'is_partner', is_partner
      ) AS metadata
    FROM
      contacts
      JOIN contacts_attributes_date AS ca
        ON contacts.id = ca.contact
      JOIN contacts_attribute_defs AS cad
        ON ca.attribute_def = cad.id
    WHERE
      cad.deleted_at IS NULL
      AND contacts.parked IS NOT TRUE
  )`,
  `CREATE OR REPLACE VIEW calendar.crm_association AS (
    SELECT
      ca.id::text,
      ct.created_by,
      ct.created_at,
      ct.updated_at,
      ct.deleted_at,
      ct.deleted_at AS parent_deleted_at,
      GREATEST(ct.created_at, ct.updated_at, ct.deleted_at) AS last_updated_at,
      'crm_association' AS object_type,
      ct.task_type AS event_type,
      ct.task_type AS type_label,
      ct.due_date AS "timestamp",
      ct.due_date::date AS "date",
      ct.due_date AS next_occurence,
      ct.end_date,
      False AS recurring,
      ct.title,
      ct.id AS crm_task,
      ct.all_day as all_day,
      ca.deal,
      ca.contact,
      ca.email AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      (
        SELECT
          ARRAY_AGG("user")
        FROM
          crm_tasks_assignees
        WHERE
          crm_task = ct.id
          AND deleted_at IS NULL
      ) AS users,
      NULL::uuid[] AS accessible_to,
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', contact,
            'type', 'contact'
          ))
        FROM
          (
            SELECT
              contact
            FROM
              crm_associations
            WHERE
              crm_task = ct.id
              AND deleted_at IS NULL
              AND association_type = 'contact'
            LIMIT 5
          ) t
      ) AS people,
      (
        SELECT
          COUNT(contact)::INT
        FROM
          crm_associations
        WHERE
          crm_task = ct.id
          AND deleted_at IS NULL
          AND association_type = 'contact'
      ) AS people_len,
      ct.brand,
      ct.status,
      jsonb_build_object(
        'status', ct.status,
        'all_day', ct.all_day
      ) AS metadata
    FROM
      crm_associations AS ca
      JOIN crm_tasks AS ct
        ON ca.crm_task = ct.id
    WHERE
      ca.deleted_at IS NULL
      AND ct.deleted_at IS NULL
  )`,
  `CREATE OR REPLACE VIEW calendar.crm_task AS (
    SELECT
      id::text,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      deleted_at AS parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'crm_task' AS object_type,
      task_type AS event_type,
      task_type AS type_label,
      due_date AS "timestamp",
      due_date::date AS "date",
      due_date AS next_occurence,
      end_date,
      False AS recurring,
      title,
      id AS crm_task,
      all_day,
      NULL::uuid AS deal,
      NULL::uuid AS contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      (
        SELECT
          ARRAY_AGG("user")
        FROM
          crm_tasks_assignees
        WHERE
          crm_task = ct.id
          AND deleted_at IS NULL
      ) AS users,
      NULL::uuid[] AS accessible_to,
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', contact,
            'type', 'contact'
          ))
        FROM
          (
            SELECT
              contact
            FROM
              crm_associations
            WHERE
              crm_task = ct.id
              AND deleted_at IS NULL
              AND association_type = 'contact'
            LIMIT 5
          ) t
      ) AS people,
      (
        SELECT
          COUNT(contact)::INT
        FROM
          crm_associations
        WHERE
          crm_task = ct.id
          AND deleted_at IS NULL
          AND association_type = 'contact'
        LIMIT 5
      ) AS people_len,
      brand,
      status,
      jsonb_build_object(
        'status', status,
        'all_day', all_day
      ) AS metadata
    FROM
      crm_tasks AS ct
  )`,
  `CREATE OR REPLACE VIEW calendar.deal_context AS (
    SELECT
      cdc.id::text,
      deals.created_by,
      cdc.created_at,
      cdc.created_at AS updated_at,
      cdc.deleted_at AS deleted_at,
      deals.deleted_at AS parent_deleted_at,
      GREATEST(cdc.created_at, cdc.deleted_at) AS last_updated_at,
      'deal_context' AS object_type,
      cdc."key" AS event_type,
      bc.label AS type_label,
      cdc."date" AS "timestamp",
      (timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC')::date AS "date",
      cdc."date" AS next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      deals.title,
      NULL::uuid AS crm_task,
      TRUE as all_day,
      cdc.deal,
      NULL::uuid AS contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
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
      NULL::uuid[] AS accessible_to,
      NULL::json[] AS people,
      NULL::int AS people_len,
      COALESCE(dr.brand, deals.brand) AS brand,
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
      CROSS JOIN LATERAL (
        SELECT
          brand
        FROM
          deals_roles
        WHERE
          brand IS NOT NULL
          AND deleted_at IS NULL
          AND deals_roles.deal = deals.id
  
        UNION
  
        SELECT deals.brand
      ) dr
    WHERE
      deals.deleted_at IS NULL
      AND cdc.data_type = 'Date'::context_data_type
      AND dcl.deleted_at     IS NULL
      AND dcl.deactivated_at IS NULL
      AND dcl.terminated_at  IS NULL
      AND deals.faired_at    IS NOT NULL
      AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}', cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
  )`,
  `CREATE OR REPLACE VIEW calendar.email_campaign_email_executed AS (
    SELECT
      ec.id::text,
      ec.created_by,
      ec.created_at,
      ec.updated_at,
      ec.deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
      'email_campaign_recipient' AS object_type,
      'executed_email' AS event_type,
      'Executed Email' AS type_label,
      executed_at AS "timestamp",
      executed_at::date AS "date",
      executed_at AS next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      subject AS title,
      NULL::uuid AS crm_task,
      FALSE as all_day,
      ec.deal,
      c.id AS contact,
      ec.id AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      ARRAY[ec.from] AS users,
      NULL::uuid[] AS accessible_to,
  
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', COALESCE(contact, agent),
            'type', (CASE WHEN contact IS NOT NULL THEN 'contact' ELSE 'agent' END)
          ))
        FROM
          (
            SELECT
              contacts.id AS contact,
              email_campaign_emails.agent
            FROM
              email_campaign_emails
              LEFT JOIN contacts
                ON ((LOWER(contacts.email::text)::text[] @> ARRAY[LOWER(email_campaign_emails.email_address)]) OR (contacts.id = email_campaign_emails.contact))
                    AND contacts.brand = ec.brand
                    AND contacts.deleted_at IS NULL
                    AND contacts.parked IS NOT TRUE
            WHERE
              email_campaign_emails.campaign = ec.id
              AND (email_campaign_emails.agent IS NOT NULL OR contacts.id IS NOT NULL)
            LIMIT 5
          ) t
      ) AS people,
  
      (
        SELECT
          count(*)::int
        FROM
          email_campaign_emails
        WHERE
          email_campaign_emails.campaign = ec.id
      ) AS people_len,
  
      ec.brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      email_campaigns AS ec
      JOIN email_campaign_emails AS ece
        ON ece.campaign = ec.id
      JOIN contacts c
        ON (c.brand = ec.brand AND ec.id = ece.campaign)
    WHERE
      ec.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND c.parked IS NOT TRUE
      AND LOWER(c.email::text)::text[] @> ARRAY[LOWER(ece.email_address)]
      AND ec.executed_at IS NOT NULL
      AND ec.thread_key IS NULL
  )`,
  '',
  `CREATE OR REPLACE VIEW calendar.email_campaign_executed AS (
    SELECT
      ec.id::text,
      ec.created_by,
      ec.created_at,
      ec.updated_at,
      ec.deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
      'email_campaign' AS object_type,
      'executed_email' AS event_type,
      'Executed Email' AS type_label,
      executed_at AS "timestamp",
      executed_at::date AS "date",
      executed_at AS next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      subject AS title,
      NULL::uuid AS crm_task,
      FALSE as all_day,
      ec.deal,
      NULL::uuid AS contact,
      id AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      ARRAY[ec.from] AS users,
      NULL::uuid[] AS accessible_to,
  
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', COALESCE(contact, agent),
            'type', (CASE WHEN contact IS NOT NULL THEN 'contact' ELSE 'agent' END)
          ))
        FROM
          (
            SELECT
              c.id AS contact,
              ece.agent
            FROM
              email_campaign_emails AS ece
              LEFT JOIN contacts AS c
                ON (((c.id = ece.contact) OR (LOWER(c.email::text)::text[] @> ARRAY[LOWER(ece.email_address)])) AND c.brand = ec.brand AND c.deleted_at IS NULL)
            WHERE
              ece.campaign = ec.id
              AND (ece.agent IS NOT NULL OR c.id IS NOT NULL)
              AND c.parked IS NOT TRUE
            LIMIT 5
          ) t
      ) AS people,
  
      (
        SELECT
          count(*)::int
        FROM
          email_campaign_emails AS ece
        WHERE
          ece.campaign = ec.id
      ) AS people_len,
  
      brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      email_campaigns AS ec
    WHERE
      deleted_at IS NULL
      AND executed_at IS NOT NULL
      AND due_at IS NOT NULL
      AND thread_key IS NULL
  )`,
  `CREATE OR REPLACE VIEW calendar.email_campaign_scheduled AS (
    SELECT
      id::text,
      ec.created_by,
      ec.created_at,
      ec.updated_at,
      ec.deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
      'email_campaign' AS object_type,
      'scheduled_email' AS event_type,
      'Scheduled Email' AS type_label,
      due_at AS "timestamp",
      due_at::date AS "date",
      due_at AS next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      subject AS title,
      NULL::uuid AS crm_task,
      FALSE as all_day,
      ec.deal,
      NULL::uuid AS contact,
      id AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      ARRAY[ec.from] AS users,
      NULL::uuid[] AS accessible_to,
  
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', COALESCE(contact, agent),
            'type', (CASE WHEN contact IS NOT NULL THEN 'contact' ELSE 'agent' END)
          ))
        FROM
          (
            SELECT
              contact,
              agent
            FROM
              email_campaigns_recipient_emails AS ecr
            WHERE
              campaign = ec.id
            LIMIT 5
          ) t
      ) AS people,
  
      (
        SELECT
          COUNT(DISTINCT email)::int
        FROM
          email_campaigns_recipient_emails AS ecr
        WHERE
          campaign = ec.id
      ) AS people_len,
  
      brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      email_campaigns AS ec
    WHERE
      deleted_at IS NULL
      AND executed_at IS NULL
      AND due_at IS NOT NULL
  )`,
  `CREATE OR REPLACE VIEW calendar.email_thread AS (
    SELECT
      email_threads.id::text,
      email_threads.user AS created_by,
      email_threads.created_at,
      email_threads.updated_at,
      email_threads.deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'email_thread' AS object_type,
      (CASE WHEN google_credential IS NOT NULL THEN 'gmail' ELSE 'outlook' END) AS event_type,
      'Email Thread' AS type_label,
      last_message_date AS "timestamp",
      last_message_date::date AS "date",
      last_message_date AS next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      COALESCE(subject, '(no subject)') AS "title",
      NULL::uuid AS crm_task,
      FALSE as all_day,
      NULL::uuid AS deal,
      NULL::uuid AS contact,
      NULL::uuid AS campaign,
      COALESCE(google_credential, microsoft_credential) AS credential_id,
      email_threads.id AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      ARRAY[email_threads."user"] AS users,
      ARRAY[email_threads."user"] AS accessible_to,
  
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', contact,
            'type', 'contact'
          ))
        FROM
          (
            SELECT
              contacts.id AS contact
            FROM
              contacts
            WHERE
              contacts.brand = email_threads.brand
              AND contacts.email && recipients
              AND contacts.deleted_at IS NULL
              AND contacts.parked IS NOT TRUE
            LIMIT 5
          ) t
      ) AS people,
  
      (
        SELECT
          count(DISTINCT contacts.id)::int
        FROM
          contacts
        WHERE
          contacts.brand = email_threads.brand
          AND contacts.email && recipients
          AND contacts.deleted_at IS NULL
          AND contacts.parked IS NOT TRUE
      ) AS people_len,
  
      email_threads.brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      email_threads
    WHERE
      email_threads.deleted_at IS NULL
  )`,
  `CREATE OR REPLACE VIEW calendar.email_thread_recipient AS (
    SELECT
      email_threads.id::text,
      email_threads."user" AS created_by,
      email_threads.created_at,
      email_threads.updated_at,
      email_threads.deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(email_threads.created_at, email_threads.updated_at, email_threads.deleted_at) AS last_updated_at,
      'email_thread_recipient' AS object_type,
      (CASE WHEN google_credential IS NOT NULL THEN 'gmail' ELSE 'outlook' END) AS event_type,
      'Email Thread' AS type_label,
      last_message_date AS "timestamp",
      last_message_date::date AS "date",
      last_message_date AS next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      COALESCE(subject, '(no subject)') AS "title",
      NULL::uuid AS crm_task,
      FALSE as all_day,
      NULL::uuid AS deal,
      c.id AS contact,
      NULL::uuid AS campaign,
      google_credential AS credential_id,
      email_threads.id AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      ARRAY[email_threads."user"] AS users,
      ARRAY[email_threads."user"] AS accessible_to,
  
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', contact,
            'type', 'contact'
          ))
        FROM
          (
            SELECT
              contacts.id AS contact
            FROM
              contacts
            WHERE
              contacts.brand = email_threads.brand
              AND contacts.email && recipients
              AND contacts.deleted_at IS NULL
            LIMIT 5
          ) t
      ) AS people,
  
      (
        SELECT
          count(DISTINCT contacts.id)::int
        FROM
          contacts
        WHERE
          contacts.brand = email_threads.brand
          AND contacts.email && recipients
          AND contacts.deleted_at IS NULL
      ) AS people_len,
  
      c.brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      email_threads
      JOIN contacts AS c
        ON c.email && recipients
    WHERE
      email_threads.deleted_at IS NULL
      AND email_threads.brand = c.brand
  )`,
  `CREATE OR REPLACE VIEW calendar.flow AS (
    SELECT
      id::text,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'flow' AS object_type,
      'last_step_date' AS event_type,
      'Flow Start' AS type_label,
      starts_at::timestamptz AS "timestamp",
      starts_at::date AS "date",
      starts_at as next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      name::text AS title,
      NULL::uuid AS crm_task,
      TRUE AS all_day,
      NULL::uuid AS deal,
      contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      id AS flow,
      ARRAY[created_by] AS users,
      NULL::uuid[] AS accessible_to,
      NULL::json[] AS people,
      0 AS people_len,
      brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      flows
    WHERE
      flows.deleted_at IS NULL
  )`,
  `CREATE OR REPLACE VIEW calendar.home_anniversary AS (
    SELECT
      c.contact::text || ':' || cdc.id::text AS id,
      cdc.created_by,
      cdc.created_at,
      cdc.created_at AS updated_at,
      cdc.deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(cdc.created_at, cdc.deleted_at) AS last_updated_at,
      'deal_context' AS object_type,
      'home_anniversary' AS event_type,
      'Home Anniversary' AS type_label,
      cdc."date" AS "timestamp",
      (timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC')::date AS "date",
      cast(cdc."date" + ((extract(year from age(cdc."date")) + 1) * interval '1 year') as date) AS next_occurence,
      NULL::timestamptz AS end_date,
      TRUE AS recurring,
      cdc.title,
      NULL::uuid AS crm_task,
      TRUE as all_day,
      cdc.deal,
      c.contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      (
        SELECT
          ARRAY_AGG(DISTINCT r."user")
        FROM
          deals_roles AS r
        WHERE
          r.deal = cdc.deal
          AND r.deleted_at IS NULL
          AND r."user" IS NOT NULL
      ) AS users,
      NULL::uuid[] AS accessible_to,
      ARRAY[json_build_object(
        'id', c.contact,
        'type', 'contact'
      )] AS people,
      1 AS people_len,
      cdc.brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      contacts_emails AS c
      JOIN calendar.deals_closed_buyers AS cdc
        ON cdc.email = c.email
    WHERE
      c.brand = cdc.brand
  )`,
  `CREATE OR REPLACE VIEW calendar.showing AS (
    SELECT
      a.id::text,
      s.created_by,
      a.created_at,
      a.updated_at,
      (CASE WHEN a.status = 'Cancelled' THEN a.updated_at ELSE NULL END) AS deleted_at,
      s.deleted_at AS parent_deleted_at,
      GREATEST(a.created_at, a.updated_at) AS last_updated_at,
      'showing_appointment' AS object_type,
      'due_date' AS event_type,
      'Showing' AS type_label,
      time AS "timestamp",
      time::date AS "date",
      time as next_occurence,
      (a.time + s.duration) AS end_date,
      False AS recurring,
      NULL::text AS title,
      NULL::uuid AS crm_task,
      FALSE AS all_day,
      s.deal,
      a.contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      s.id AS showing,
      NULL::uuid AS flow,
      (
        SELECT
          ARRAY_AGG(DISTINCT r."user")
        FROM
          showings_roles AS r
        WHERE
          r.showing = s.id
          AND r.deleted_at IS NULL
          AND r."user" IS NOT NULL
      ) AS users,
      NULL::uuid[] AS accessible_to,
      ARRAY[json_build_object(
        'id', a.contact,
        'type', 'contact'
      )] AS people,
      1 AS people_len,
      sr.brand,
      a.status::text AS status,
      NULL::jsonb AS metadata
    FROM
      showings AS s
      JOIN showings_appointments AS a
        ON a.showing = s.id
      CROSS JOIN LATERAL (
        SELECT DISTINCT
          brand
        FROM
          showings_roles
        WHERE
          brand IS NOT NULL
          AND deleted_at IS NULL
          AND showings_roles.showing = s.id
  
        UNION
  
        SELECT s.brand
      ) sr
    WHERE
      a.status = 'Pending'::showing_appointment_status
  )`,
  `CREATE OR REPLACE VIEW analytics.calendar AS (
    (
      SELECT * FROM calendar.activity
    )
    UNION ALL
    (
      SELECT * FROM calendar.contact
    )
    UNION ALL
    (
      SELECT * FROM calendar.contact_attribute
    )
    UNION ALL
    (
      SELECT * FROM calendar.crm_association
    )
    UNION ALL
    (
      SELECT * FROM calendar.crm_task
    )
    UNION ALL
    (
      SELECT * FROM calendar.deal_context
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_campaign_email_executed
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_campaign_executed
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_campaign_scheduled
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_thread
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_thread_recipient
    )
    UNION ALL
    (
      SELECT * FROM calendar.flow
    )
    UNION ALL
    (
      SELECT * FROM calendar.home_anniversary
    )
    UNION ALL
    (
      SELECT * FROM calendar.showing
    )
  )`,
  `CREATE OR REPLACE VIEW triggers_due AS (
    (
      SELECT
        t.*,
        'contact' AS trigger_object_type,
        c.object_type,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time AS timestamp,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time - interval '3 days' AS due_at
      FROM
        triggers AS t
        JOIN calendar.contact_attribute AS c
          ON t.contact = c.contact
        JOIN users AS u
          ON (t.user = u.id)
      WHERE
        c.brand = t.brand
        AND t.contact IS NOT NULL
        AND t.event_type = c.event_type
        AND t.executed_at IS NULL
        AND t.effective_at <= NOW()
        AND t.failed_at IS NULL
        AND t.deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        t.*,
        'deal' AS trigger_object_type,
        c.object_type,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time AS timestamp,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time - interval '3 days' AS due_at
      FROM
        triggers AS t
        JOIN calendar.deal_context AS c
          ON t.deal = c.deal
        JOIN users AS u
          ON (t.user = u.id)
      WHERE
        c.brand = t.brand
        AND t.deal IS NOT NULL
        AND t.event_type = c.event_type
        AND t.executed_at IS NULL
        AND t.effective_at <= NOW()
        AND t.failed_at IS NULL
        AND t.deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        t.*,
        (CASE WHEN t.contact IS NOT NULL THEN 'contact' WHEN t.deal IS NOT NULL THEN 'deal' ELSE NULL END) AS trigger_object_type,
        c.object_type,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time AS timestamp,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time - interval '3 days' AS due_at
      FROM
        triggers AS t
        JOIN calendar.flow AS c
          ON (t.deal = c.deal OR t.contact = c.contact)
        JOIN users AS u
          ON (t.user = u.id)
      WHERE
        c.brand = t.brand
        AND c.event_type = 'last_step_date'
        AND t.event_type = 'last_step_date'
        AND t.deleted_at IS NULL
        AND t.executed_at IS NULL
        AND t.effective_at <= NOW()
        AND t.failed_at IS NULL
    )
  )`,
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
