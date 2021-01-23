const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION update_email_campaign_stats(campaign_id uuid)
RETURNS void AS
$$
  WITH events AS (
    SELECT recipient, event, email, campaign
    FROM emails_events
    JOIN emails ON emails.id = emails_events.email
    WHERE emails.campaign = $1
  ),

  recipient_counts AS (
    SELECT
      recipient,
      count(*) filter(WHERE events.event = 'accepted')     as accepted,
      count(*) filter(WHERE events.event = 'rejected')     as rejected,
      count(*) filter(WHERE events.event = 'delivered')    as delivered,
      count(*) filter(WHERE events.event = 'failed')       as failed,
      count(*) filter(WHERE events.event = 'opened')       as opened,
      count(*) filter(WHERE events.event = 'clicked')      as clicked,
      count(*) filter(WHERE events.event = 'unsubscribed') as unsubscribed,
      count(*) filter(WHERE events.event = 'complained')   as complained,
      count(*) filter(WHERE events.event = 'stored')       as stored
    FROM events
    GROUP BY recipient
    ORDER BY recipient
  ),

  update_recipients AS (
    UPDATE email_campaign_emails ece SET
      accepted     = rc.accepted,
      rejected     = rc.rejected,
      delivered    = rc.delivered,
      failed       = rc.failed,
      opened       = rc.opened,
      clicked      = rc.clicked,
      unsubscribed = rc.unsubscribed,
      complained   = rc.complained,
      stored       = rc.stored
    FROM recipient_counts rc
    WHERE ece.campaign = $1
    AND LOWER(ece.email_address) = LOWER(rc.recipient)
  ),

  email_counts AS (
    SELECT
        email,
        count(DISTINCT email) filter(WHERE events.event = 'accepted')     as accepted,
        count(DISTINCT email) filter(WHERE events.event = 'rejected')     as rejected,
        count(DISTINCT email) filter(WHERE events.event = 'delivered')    as delivered,
        count(DISTINCT email) filter(WHERE events.event = 'failed')       as failed,
        count(DISTINCT email) filter(WHERE events.event = 'opened')       as opened,
        count(DISTINCT email) filter(WHERE events.event = 'clicked')      as clicked,
        count(DISTINCT email) filter(WHERE events.event = 'unsubscribed') as unsubscribed,
        count(DISTINCT email) filter(WHERE events.event = 'complained')   as complained,
        count(DISTINCT email) filter(WHERE events.event = 'stored')       as stored
      FROM events
      GROUP BY email
      ORDER BY email
  ),

  update_emails AS (
    UPDATE emails SET
      accepted     = ec.accepted,
      rejected     = ec.rejected,
      delivered    = ec.delivered,
      failed       = ec.failed,
      opened       = ec.opened,
      clicked      = ec.clicked,
      unsubscribed = ec.unsubscribed,
      complained   = ec.complained,
      stored       = ec.stored
    FROM email_counts ec
    WHERE emails.campaign = $1
    AND emails.id = ec.email
  ),

  campaign_counts AS (
    SELECT
      (
        count(DISTINCT recipient) filter(WHERE events.event = 'accepted' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'accepted' AND recipient is NULL)
      ) as accepted,

      (
        count(DISTINCT recipient) filter(WHERE events.event = 'rejected' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'rejected' AND recipient is NULL)
      ) as rejected,

      (
        count(DISTINCT recipient) filter(WHERE events.event = 'delivered' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'delivered' AND recipient is NULL)
      ) as delivered,

      (
        count(DISTINCT recipient) filter(WHERE events.event = 'failed' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'failed' AND recipient is NULL)
      ) as failed,

      (
        count(DISTINCT recipient) filter(WHERE events.event = 'opened' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'opened' AND recipient is NULL)
      ) as opened,

      (
        count(DISTINCT recipient) filter(WHERE events.event = 'clicked' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'clicked' AND recipient is NULL)
      ) as clicked,

      (
        count(DISTINCT recipient) filter(WHERE events.event = 'unsubscribed' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'unsubscribed' AND recipient is NULL)
      ) as unsubscribed,

      (
        count(DISTINCT recipient) filter(WHERE events.event = 'complained' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'complained' AND recipient is NULL)
      ) as complained,

      (
        count(DISTINCT recipient) filter(WHERE events.event = 'stored' AND recipient is NOT NULL)
        +
        count(*) filter(WHERE events.event = 'stored' AND recipient is NULL)
      ) as stored

      -- count(DISTINCT recipient) filter(WHERE events.event = 'accepted')     as accepted,
      -- count(DISTINCT recipient) filter(WHERE events.event = 'rejected')     as rejected,
      -- count(DISTINCT recipient) filter(WHERE events.event = 'delivered')    as delivered,
      -- count(DISTINCT recipient) filter(WHERE events.event = 'failed')       as failed,
      -- count(DISTINCT recipient) filter(WHERE events.event = 'opened')       as opened,
      -- count(DISTINCT recipient) filter(WHERE events.event = 'clicked')      as clicked,
      -- count(DISTINCT recipient) filter(WHERE events.event = 'unsubscribed') as unsubscribed,
      -- count(DISTINCT recipient) filter(WHERE events.event = 'complained')   as complained,
      -- count(DISTINCT recipient) filter(WHERE events.event = 'stored')       as stored
    FROM events
  )

  UPDATE email_campaigns SET
    accepted     = cc.accepted,
    rejected     = cc.rejected,
    delivered    = cc.delivered,
    failed       = cc.failed,
    opened       = cc.opened,
    clicked      = cc.clicked,
    unsubscribed = cc.unsubscribed,
    complained   = cc.complained,
    stored       = cc.stored
  FROM campaign_counts cc
  WHERE email_campaigns.id = $1
$$
LANGUAGE SQL;`,
  `CREATE OR REPLACE VIEW crm_last_touches AS (
  SELECT DISTINCT ON (contact)
    contact,
    max(timestamp) OVER (PARTITION BY contact) AS last_touch,
    action,
    reference
  FROM
    (
      (
        SELECT
          ca.contact,
          ct.due_date AS "timestamp",
          ct.task_type AS action,
          ct.id AS reference
        FROM
          crm_associations AS ca
          JOIN crm_tasks AS ct
            ON ca.crm_task = ct.id
        WHERE
          ca.deleted_at IS NULL
          AND ct.deleted_at IS NULL
          AND ct.task_type <> ALL('{Note,Other}')
          AND ct.due_date <= NOW()
      ) UNION ALL (
        SELECT
          c.id,
          message_date AS "timestamp",
          'email' AS action,
          google_messages.id AS reference
        FROM
          google_messages
          JOIN google_credentials
            ON google_messages.google_credential = google_credentials.id
          CROSS JOIN LATERAL (
            SELECT
              contacts.id
            FROM
              contacts
            WHERE
              contacts.email && google_messages.recipients
              AND contacts.brand = google_credentials.brand
              AND contacts.deleted_at IS NULL
              AND google_messages.deleted_at IS NULL
          ) AS c
        WHERE
          google_credentials.deleted_at IS NULL
          AND google_credentials.revoked IS NOT TRUE
      ) UNION ALL (
        SELECT
          c.id,
          message_date AS "timestamp",
          'email' AS action,
          microsoft_messages.id AS reference
        FROM
          microsoft_messages
          JOIN microsoft_credentials
            ON microsoft_messages.microsoft_credential = microsoft_credentials.id
          CROSS JOIN LATERAL (
            SELECT
              contacts.id
            FROM
              contacts
            WHERE
              contacts.email && microsoft_messages.recipients
              AND contacts.brand = microsoft_credentials.brand
              AND contacts.deleted_at IS NULL
              AND microsoft_messages.deleted_at IS NULL
          ) AS c
        WHERE
          microsoft_credentials.deleted_at IS NULL
          AND microsoft_credentials.revoked IS NOT TRUE
      ) UNION ALL (
        SELECT
          c.id AS contact,
          executed_at AS "timestamp",
          'email' AS action,
          ec.id AS reference
        FROM
          email_campaigns AS ec
          JOIN email_campaign_emails AS ece
            ON ece.campaign = ec.id
          JOIN contacts c
            ON (c.brand = ec.brand)
        WHERE
          ec.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND LOWER(ece.email_address) = ANY(LOWER(c.email::text)::text[])
          AND ec.executed_at IS NOT NULL
      )
    ) AS touches
  ORDER BY
    contact,
    "timestamp" DESC
)
`,
  `CREATE OR REPLACE VIEW analytics.calendar AS (
  (
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
      due_date AS "date",
      NULL::timestamptz AS next_occurence,
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
  )
  UNION ALL
  (
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
      ct.due_date AS "date",
      NULL::timestamptz AS next_occurence,
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
  )
  UNION ALL
  (
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
      timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC' AS "date",
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
  )
  UNION ALL
  (
    SELECT
      cr.contact::text || ':' || cdc.id::text AS id,
      deals.created_by,
      cdc.created_at,
      cdc.created_at AS updated_at,
      cdc.deleted_at,
      deals.deleted_at AS parent_deleted_at,
      GREATEST(cdc.created_at, cdc.deleted_at) AS last_updated_at,
      'deal_context' AS object_type,
      'home_anniversary' AS event_type,
      'Home Anniversary' AS type_label,
      cdc."date" AS "timestamp",
      timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC' AS "date",
      cast(cdc."date" + ((extract(year from age(cdc."date")) + 1) * interval '1 year') as date) AS next_occurence,
      NULL::timestamptz AS end_date,
      True AS recurring,
      deals.title,
      NULL::uuid AS crm_task,
      TRUE as all_day,
      cdc.deal,
      cr.contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
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
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', contact,
            'type', 'contact'
          ))
        FROM
          contacts_roles
        WHERE
          role_name = 'Buyer'
          AND deal = deals.id
      ) AS people,
      NULL::int AS people_len,
      cr.brand,
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
      -- JOIN brands_checklists bcl
      --   ON dcl.origin = bcl.id
      JOIN contacts_roles cr
        ON (deals.id = cr.deal)
    WHERE
      deals.deleted_at IS NULL
      AND (
        (cdc.key = 'closing_date' AND cdc.date < NOW())
        OR cdc.key = 'lease_end'
      )
      AND cr.role_name = 'Buyer'
      AND deals.deal_type = 'Buying'
      -- AND bcl.deal_type = 'Buying'
      AND dcl.deleted_at     IS NULL
      AND dcl.deactivated_at IS NULL
      -- AND bcl.deleted_at     Is NULL
      AND dcl.terminated_at  IS NULL
      AND deals.faired_at    IS NOT NULL
      AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}', cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
  )
  UNION ALL
  (
    SELECT
      ca.id::text,
      contacts.created_by,
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
      "date" AS "timestamp",
      timezone('UTC', date_trunc('day', "date")::timestamp) AT TIME ZONE 'UTC' AS "date",
      cast("date" + ((extract(year from age("date")) + 1) * interval '1' year) as date) as next_occurence,
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
      JOIN contacts_attributes AS ca
        ON contacts.id = ca.contact
      JOIN contacts_attribute_defs AS cad
        ON ca.attribute_def = cad.id
    WHERE
      cad.deleted_at IS NULL
      AND data_type = 'date'
      AND contacts.parked IS NOT TRUE
  )
  UNION ALL
  (
    SELECT
      id::text,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      NULL as parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'contact' AS object_type,
      'next_touch' AS event_type,
      'Next Touch' AS type_label,
      next_touch AS "timestamp",
      next_touch AS "date",
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
  )
  UNION ALL
  (
    SELECT
      id::text,
      ec.created_by,
      ec.created_at,
      ec.updated_at,
      ec.deleted_at,
      NULL AS parent_deleted_at,
      GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
      'email_campaign' AS object_type,
      'scheduled_email' AS event_type,
      'Scheduled Email' AS type_label,
      due_at AS "timestamp",
      due_at AS "date",
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
  )
  UNION ALL
  (
    SELECT
      ec.id::text,
      ec.created_by,
      ec.created_at,
      ec.updated_at,
      ec.deleted_at,
      NULL AS parent_deleted_at,
      GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
      'email_campaign' AS object_type,
      'executed_email' AS event_type,
      'Executed Email' AS type_label,
      executed_at AS "timestamp",
      executed_at AS "date",
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
  )
  -- UNION ALL
  -- (
  --   SELECT
  --     ec.id::text,
  --     ec.created_by,
  --     ec.created_at,
  --     ec.updated_at,
  --     ec.deleted_at,
  --     NULL AS parent_deleted_at,
  --     'email_campaign_recipient' AS object_type,
  --     'scheduled_email' AS event_type,
  --     'Scheduled Email' AS type_label,
  --     ec.due_at AS "timestamp",
  --     ec.due_at AS "date",
  --     ec.due_at AS next_occurence,
  --     NULL::timestamptz AS end_date,
  --     False AS recurring,
  --     ec.subject AS title,
  --     NULL::uuid AS crm_task,
  --     FALSE as all_day,
  --     ec.deal,
  --     c.id AS contact,
  --     ec.id AS campaign,
  --     NULL::uuid AS credential_id,
  --     NULL::text AS thread_key,
  --     NULL::uuid AS activity,
  --     ARRAY[ec.from] AS users,
  --     NULL::uuid[] AS accessible_to,
  --     (
  --       SELECT
  --         ARRAY_AGG(json_build_object(
  --           'id', COALESCE(contact, agent),
  --           'type', (CASE WHEN contact IS NOT NULL THEN 'contact' ELSE 'agent' END)
  --         ))
  --       FROM
  --         (
  --           SELECT
  --             contact,
  --             agent
  --           FROM
  --             email_campaigns_recipient_emails
  --           WHERE
  --             campaign = ec.id
  --           LIMIT 5
  --         ) t
  --     ) AS people,
  --     (
  --       SELECT
  --         COUNT(DISTINCT email)::int
  --       FROM
  --         email_campaigns_recipient_emails
  --       WHERE
  --         campaign = ec.id
  --     ) AS people_len,
  --     ec.brand,
  --     NULL::text AS status,
  --     NULL::jsonb AS metadata
  --   FROM
  --     email_campaigns AS ec
  --     JOIN email_campaigns_recipient_emails AS ecr
  --       ON ec.id = ecr.campaign
  --     JOIN contacts AS c
  --       ON c.brand = ec.brand AND c.email && ARRAY[ecr.email]
  --   WHERE
  --     ec.deleted_at IS NULL
  --     AND ec.executed_at IS NULL
  --     AND ec.due_at IS NOT NULL
  --     AND ecr.contact IS NOT NULL
  --     AND c.deleted_at IS NULL
  -- )
  UNION ALL
  (
    SELECT
      ec.id::text,
      ec.created_by,
      ec.created_at,
      ec.updated_at,
      ec.deleted_at,
      NULL AS parent_deleted_at,
      GREATEST(ec.created_at, ec.updated_at, ec.deleted_at) AS last_updated_at,
      'email_campaign_recipient' AS object_type,
      'executed_email' AS event_type,
      'Executed Email' AS type_label,
      executed_at AS "timestamp",
      executed_at AS "date",
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
  )
  UNION ALL
  (
    SELECT
      email_threads.id::text,
      email_threads.user AS created_by,
      email_threads.created_at,
      email_threads.updated_at,
      email_threads.deleted_at,
      NULL AS parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'email_thread' AS object_type,
      (CASE WHEN google_credential IS NOT NULL THEN 'gmail' ELSE 'outlook' END) AS event_type,
      'Email Thread' AS type_label,
      last_message_date AS "timestamp",
      last_message_date AS "date",
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
  )
  UNION ALL
  (
    SELECT
      email_threads.id::text,
      email_threads."user" AS created_by,
      email_threads.created_at,
      email_threads.updated_at,
      email_threads.deleted_at,
      NULL AS parent_deleted_at,
      GREATEST(email_threads.created_at, email_threads.updated_at, email_threads.deleted_at) AS last_updated_at,
      'email_thread_recipient' AS object_type,
      (CASE WHEN google_credential IS NOT NULL THEN 'gmail' ELSE 'outlook' END) AS event_type,
      'Email Thread' AS type_label,
      last_message_date AS "timestamp",
      last_message_date AS "date",
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

      brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      email_threads
      CROSS JOIN LATERAL (
        SELECT
          contacts.id
        FROM
          contacts
        WHERE
          contacts.email && recipients
          AND contacts.parked IS NOT TRUE
      ) AS c
    WHERE
      email_threads.deleted_at IS NULL
  )
  UNION ALL
  (
    SELECT
      a.id::text,
      a.created_by,
      a.created_at,
      a.updated_at,
      a.deleted_at,
      NULL AS parent_deleted_at,
      GREATEST(a.created_at, a.updated_at, a.deleted_at) AS last_updated_at,
      'activity' AS object_type,
      "action"::text AS event_type,
      "action"::text AS type_label,
      a.created_at AS "timestamp",
      timezone('UTC', date_trunc('day', a.created_at)::timestamp) AT TIME ZONE 'UTC' AS "date",
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
      NULL::uuid AS flow,
      ARRAY[contacts."user"] AS users,
      NULL::uuid[] AS accessible_to,
      ARRAY[json_build_object('id', contact, 'type', 'contact')]::json[] AS people,
      1 AS people_len,
      contacts.brand,
      NULL::text AS status,
      NULL AS metadata
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
  )
  UNION ALL
  (
    SELECT
      id::text,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      NULL AS parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'flow' AS object_type,
      'last_step_date' AS event_type,
      'Flow Start' AS type_label,
      starts_at::timestamptz AS "timestamp",
      starts_at AS "date",
      NULL as next_occurence,
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
      id AS flow,
      ARRAY[created_by] AS users,
      NULL::uuid[] AS accessible_to,
      NULL::json[] AS people,
      0 AS people_len,
      brand,
      NULL::text AS status,
      NULL AS metadata
    FROM
      flows
    WHERE
      flows.deleted_at IS NULL
  )
)`,
  'SELECT update_email_campaign_stats(id) FROM email_campaigns',
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
