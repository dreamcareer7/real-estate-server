const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE VIEW analytics.mini_deals AS
    WITH training_brands AS (
      SELECT
        bc.id
      FROM
        brands,
        brand_children(brands.id) bc(id)
      WHERE
        training IS TRUE
    ), deal_info AS (
      SELECT
        d.id,
        d.title,
        d.brand,
        bc.deal_type,
        bc.property_type,
        dc.id AS checklist
      FROM
        deals d
        JOIN deals_checklists dc
          ON d.id = dc.deal
        JOIN brands_checklists bc
          ON bc.id = dc.origin
      WHERE
        d.faired_at IS NOT NULL
        AND d.brand NOT IN (SELECT id FROM training_brands)
        AND dc.deleted_at IS NULL
        AND dc.deactivated_at IS NULL
        AND dc.terminated_at IS NULL
    ), agent_info AS (
      SELECT
        dr.deal,
        d.checklist,
        dr.role,
        array_to_string(
          array_remove(ARRAY[
            dr.legal_first_name,
            dr.legal_middle_name,
            dr.legal_last_name
          ], ''),
          ' ',
          NULL
        ) AS name
      FROM
        deals_roles dr
        JOIN deal_info d
          ON d.id = dr.deal
      WHERE
        dr.deleted_at IS NULL
        AND dr.role = ANY('{BuyerAgent,SellerAgent}'::deal_role[])
        AND (dr.checklist IS NULL OR dr.checklist = d.checklist)
    ), role_info AS (
      SELECT
        dr.deal,
        d.checklist,
        dr.role,
        string_agg(
          array_to_string(
            array_remove(ARRAY[
              dr.legal_first_name,
              dr.legal_middle_name,
              dr.legal_last_name
            ], ''),
            ' ',
            NULL
          ) || ' (' || array_to_string(ARRAY[
            dr.email,
            dr.phone_number
          ], ', ', NULL) || ')',
        ', ') AS info
      FROM
        deals_roles dr
        JOIN deal_info d
          ON d.id = dr.deal
      WHERE
        dr.deleted_at IS NULL
        AND dr.role = ANY('{Buyer,Seller}'::deal_role[])
        AND (dr.checklist IS NULL OR dr.checklist = d.checklist)
      GROUP BY
        dr.deal,
        d.checklist,
        dr.role
    ), context_info AS (
      SELECT
        cdc.*
      FROM
        current_deal_context cdc
        JOIN deal_info di
          ON cdc.deal = di.id
        WHERE
          cdc.deleted_at IS NULL
    )
    SELECT
      di.title,
      di.id,
      di.checklist,
      di.brand,
      di.deal_type,
      di.property_type,
      bo.branch_title,
      (SELECT name FROM agent_info AS ri WHERE role = 'BuyerAgent'::deal_role AND ri.deal = di.id AND (ri.checklist IS NULL OR ri.checklist = di.checklist) LIMIT 1) AS buyer_agent,
      (SELECT name FROM agent_info AS ri WHERE role = 'SellerAgent'::deal_role AND ri.deal = di.id AND (ri.checklist IS NULL OR ri.checklist = di.checklist) LIMIT 1) AS seller_agent,
      (SELECT info FROM role_info AS ri WHERE role = 'Seller'::deal_role AND ri.deal = di.id AND (ri.checklist IS NULL OR ri.checklist = di.checklist) LIMIT 1) AS sellers,
      (SELECT info FROM role_info AS ri WHERE role = 'Buyer'::deal_role AND ri.deal = di.id AND (ri.checklist IS NULL OR ri.checklist = di.checklist) LIMIT 1) AS buyers,
      (SELECT text FROM context_info AS ci WHERE key = 'full_address' AND ci.deal = di.id LIMIT 1) AS full_address,
      (SELECT number FROM context_info AS ci WHERE key = 'sales_price' AND ci.deal = di.id LIMIT 1) AS sales_price,
      (SELECT number FROM context_info AS ci WHERE key = 'list_price' AND ci.deal = di.id LIMIT 1) AS list_price,
      (SELECT date FROM context_info AS ci WHERE key = 'closing_date' AND ci.deal = di.id LIMIT 1) AS closing_date,
      (SELECT date FROM context_info AS ci WHERE key = 'contract_date' AND ci.deal = di.id LIMIT 1) AS contract_date,
      (SELECT date FROM context_info AS ci WHERE key = 'list_date' AND ci.deal = di.id LIMIT 1) AS list_date
    FROM
      deal_info di
      JOIN brands_branches AS bo
        ON di.brand = bo.id`,

  `CREATE OR REPLACE VIEW analytics.calendar AS (
    (
      SELECT
        id::text,
        created_by,
        created_at,
        updated_at,
        deleted_at,
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
        NULL::uuid AS deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
        (
          SELECT
            ARRAY_AGG("user")
          FROM
            crm_tasks_assignees
          WHERE
            crm_task = crm_tasks.id
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
                crm_task = crm_tasks.id
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
            crm_task = crm_tasks.id
            AND deleted_at IS NULL
            AND association_type = 'contact'
          LIMIT 5
        ) AS people_len,
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
        ca.id::text,
        ct.created_by,
        ct.created_at,
        ct.updated_at,
        ct.deleted_at,
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
        ca.deal,
        ca.contact,
        ca.email AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
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
        cdc.id::text,
        deals.created_by,
        cdc.created_at,
        cdc.created_at AS updated_at,
        cdc.deleted_at AS deleted_at,
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
        cdc.deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
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
        cdc.deleted_at AS deleted_at,
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
        cdc.deal,
        cr.contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
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
        GREATEST(ca.created_at, ca.updated_at, ca.deleted_at) AS last_updated_at,
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
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
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
        contacts.deleted_at IS NULL
        AND ca.deleted_at IS NULL
        AND cad.deleted_at IS NULL
        AND data_type = 'date'
    )
    UNION ALL
    (
      SELECT
        id::text,
        created_by,
        created_at,
        updated_at,
        deleted_at,
        GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
        'contact' AS object_type,
        'next_touch' AS event_type,
        'Next Touch' AS type_label,
        next_touch AS "timestamp",
        next_touch AS "date",
        next_touch AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        display_name AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        id AS contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
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
    )
    UNION ALL
    (
      SELECT
        id::text,
        ec.created_by,
        ec.created_at,
        ec.updated_at,
        ec.deleted_at,
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
        ec.deal,
        NULL::uuid AS contact,
        id AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
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
        ec.deal,
        NULL::uuid AS contact,
        id AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
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
                  ON (((c.id = ece.contact) OR (c.email @> ARRAY[ece.email_address])) AND c.brand = ec.brand AND c.deleted_at IS NULL)
              WHERE
                ece.campaign = ec.id
                AND (ece.agent IS NOT NULL OR c.id IS NOT NULL)
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
        ec.deal,
        c.id AS contact,
        ec.id AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        NULL::uuid AS activity,
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
                  ON ((contacts.email @> ARRAY[email_campaign_emails.email_address]) OR (contacts.id = email_campaign_emails.contact))
                     AND contacts.brand = ec.brand
                     AND contacts.deleted_at IS NULL
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
        AND c.email @> ARRAY[ece.email_address]
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
        NULL::uuid AS deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
        COALESCE(google_credential, microsoft_credential) AS credential_id,
        email_threads.id AS thread_key,
        NULL::uuid AS activity,
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
        NULL::uuid AS deal,
        c.id AS contact,
        NULL::uuid AS campaign,
        google_credential AS credential_id,
        email_threads.id AS thread_key,
        NULL::uuid AS activity,
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
        NULL::uuid AS deal,
        contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        a.id AS activity,
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
        AND u.is_shadow IS NOT TRUE
        AND u.deleted_at IS NULL
        AND u.user_type = 'Client'
        AND a.deleted_at IS NULL
    )
  )`,

  `CREATE OR REPLACE FUNCTION get_deal_display_title(deal_id uuid)
  RETURNS text
  LANGUAGE SQL
  STABLE
  AS $$
    WITH dc AS (
      SELECT
        text AS full_address
      FROM
        current_deal_context
      WHERE
        deal = deal_id
        AND key = 'full_address'
        AND deleted_at IS NULL
      LIMIT 1
    ), mc AS (
      SELECT
        (
          SELECT ARRAY_TO_STRING
          (
            ARRAY[
              addresses.street_number,
              addresses.street_dir_prefix,
              addresses.street_name,
              addresses.street_suffix,
              CASE
                WHEN addresses.unit_number IS NULL THEN NULL
                WHEN addresses.unit_number = '' THEN NULL
                ELSE 'Unit ' || addresses.unit_number || ',' END,
              addresses.city || ',',
              addresses.state_code,
              addresses.postal_code
            ], ' ', NULL
          )
        ) AS full_address
      FROM
        deals
        JOIN listings ON deals.listing = listings.id
        JOIN properties ON listings.property_id = properties.id
        JOIN addresses ON properties.address_id = addresses.id
      WHERE
        deals.id = deal_id
    )
    SELECT COALESCE(
      (SELECT full_address FROM dc),
      (SELECT full_address FROM mc),
      'Draft deal'
    )
  $$`,

  `CREATE OR REPLACE FUNCTION deal_status_mask(deal_id uuid, mask text[], "key" text, masked_contexts text[], context_mask text[]) RETURNS boolean
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        (cdc.text <> ALL($2::text[])) AND (($3 <> ALL($4::text[])) OR (cdc.text <> ALL($5::text[])))
      FROM
        deals
        JOIN current_deal_context cdc
          ON cdc.deal = deals.id
      WHERE
        deals.id = $1
        AND ((
          deals.deal_type = 'Selling'
          AND cdc.key = 'listing_status'
        ) OR (
          deals.deal_type = 'Buying'
          AND cdc.key = 'contract_status'
        ))
        AND cdc.deleted_at IS NULL
      LIMIT 1
    $$`,

  `CREATE OR REPLACE VIEW analytics.deals AS
    WITH ct AS (
      SELECT * FROM
      crosstab($$
        WITH real_deals AS (
          SELECT
            deals.*
          FROM
            deals
            JOIN brands ON brands.id = deals.brand
          WHERE
            deals.brand NOT IN(
              SELECT
                brand_children(id)
              FROM
                brands
              WHERE
                training IS TRUE
            )
            AND deals.faired_at IS NOT NULL
            AND brands.deleted_at IS NULL
            AND deals.deleted_at IS NULL
        ),
        roles AS (
          SELECT
            deals_roles.deal,
            (
              CASE deals_roles.role
                WHEN 'SellerAgent' THEN 'seller_agent'
                WHEN 'BuyerAgent' THEN 'buyer_agent'
                ELSE deals_roles.role::text
              END
            ) AS role,
            (
              CASE WHEN
                (deals_roles.legal_prefix      <> '') IS NOT TRUE AND
                (deals_roles.legal_first_name  <> '') IS NOT TRUE AND
                (deals_roles.legal_middle_name <> '') IS NOT TRUE AND
                (deals_roles.legal_last_name   <> '') IS NOT TRUE
              THEN company_title
              ELSE
                ARRAY_TO_STRING(
                  ARRAY[
                    deals_roles.legal_prefix,
                    deals_roles.legal_first_name,
                    deals_roles.legal_middle_name,
                    deals_roles.legal_last_name
                  ], ' ', NULL
                )
              END
            ) as legal_full_name,
            real_deals.deal_type,
            real_deals.property_type,
            real_deals.listing,
            real_deals.brand,
            real_deals.title
          FROM
            deals_roles
            JOIN real_deals
              ON real_deals.id = deals_roles.deal
          WHERE
            role IN (
              'BuyerAgent',
              'SellerAgent'
            )
        ),
        contexts AS (
          SELECT
            ctx.*,
            real_deals.deal_type,
            real_deals.property_type,
            real_deals.listing,
            real_deals.brand,
            real_deals.title
          FROM
            current_deal_context as ctx
            INNER JOIN real_deals
              ON real_deals.id = ctx.deal
          WHERE key IN (
            'full_address',
            'list_price',
            'sales_price',
            'leased_price',
            'original_price',
            'list_date',
            'expiration_date',
            'contract_date',
            'option_period',
            'financing_due',
            'title_due',
            't47_due',
            'closing_date',
            'possession_date',
            'lease_executed',
            'lease_application_date',
            'lease_begin',
            'lease_end',
            'year_built',
            'listing_status'
          ) AND ctx.deleted_at IS NULL
        ),
        ctx_roles_union AS (
          (
            SELECT
              ctx.deal AS id,
              ctx.deal_type,
              ctx.property_type,
              ctx.listing,
              ctx.brand,
              ctx.title,
              ctx.key,
              COALESCE(ctx.text, ctx.number::text, ctx.date::text) as "value"
            FROM
              contexts AS ctx
          )
          UNION ALL (
            SELECT
              roles.deal AS id,
              roles.deal_type,
              roles.property_type,
              roles.listing,
              roles.brand,
              roles.title,
              roles.role,
              legal_full_name as "value"
            FROM
              roles
          )
        )
        SELECT
          *
        FROM
          ctx_roles_union
        ORDER BY
          id
      $$, $$ VALUES
        ('full_address'),
        ('list_price'),
        ('sales_price'),
        ('leased_price'),
        ('original_price'),
        ('seller_agent'),
        ('buyer_agent'),
        ('list_date'),
        ('expiration_date'),
        ('contract_date'),
        ('option_period'),
        ('financing_due'),
        ('title_due'),
        ('t47_due'),
        ('closing_date'),
        ('possession_date'),
        ('lease_executed'),
        ('lease_application_date'),
        ('lease_begin'),
        ('lease_end'),
        ('year_built'),
        ('listing_status')
      $$) t(
        id uuid,
        deal_type deal_type,
        property_type deal_property_type,
        listing uuid,
        brand uuid,
        title text,
        full_address text,
        list_price double precision,
        sales_price double precision,
        leased_price double precision,
        original_price double precision,
        seller_agent text,
        buyer_agent text,
        list_date timestamptz,
        expiration_date timestamptz,
        contract_date timestamptz,
        option_period timestamptz,
        financing_due timestamptz,
        title_due timestamptz,
        t47_due timestamptz,
        closing_date timestamptz,
        possession_date timestamptz,
        lease_executed timestamptz,
        lease_application_date timestamptz,
        lease_begin timestamptz,
        lease_end timestamptz,
        year_built double precision,
        listing_status text
      )
    )
    SELECT ct.id,
      ct.deal_type,
      ct.property_type,
      ct.listing,
      ct.brand,
      ct.title,
      bo.branch_title,
      ct.full_address,
      ct.list_price,
      ct.sales_price,
      ct.leased_price,
      ct.original_price,
      ct.seller_agent,
      ct.buyer_agent,
      ct.list_date::date,
      ct.expiration_date,
      ct.contract_date::date,
      ct.option_period,
      ct.financing_due,
      ct.title_due,
      ct.t47_due,
      ct.closing_date::date,
      date_trunc('year', ct.closing_date)::date AS closing_date_year,
      date_trunc('quarter', ct.closing_date)::date AS closing_date_quarter,
      date_trunc('month', ct.closing_date)::date AS closing_date_month,
      date_trunc('week', ct.closing_date)::date AS closing_date_week,
      date_trunc('day', ct.closing_date)::date AS closing_date_day,
      ct.possession_date,
      ct.lease_executed,
      ct.lease_application_date,
      ct.lease_begin,
      ct.lease_end,
      ct.year_built,
      ct.listing_status
    FROM
      ct
    JOIN brands_branches AS bo
      ON ct.brand = bo.id`,

  `CREATE OR REPLACE FUNCTION update_current_deal_context(deal_id uuid)
  RETURNS void AS
  $$
    BEGIN
      DELETE FROM current_deal_context WHERE deal = deal_id;
  
      INSERT INTO current_deal_context
  
      WITH definitions AS (
        SELECT * FROM brands_contexts
        WHERE brand IN (SELECT brand_parents((SELECT brand FROM deals WHERE id = $1)))
      ),
  
      last_deal_context AS (
        SELECT
          DISTINCT ON (deal_context.deal, deal_context.key)
          deal_context.id,
          'deal_context_item'::text as type,
          deal_context.created_at,
          deal_context.created_by,
          deal_context.approved_by,
          deal_context.approved_at,
          deal_context.key,
          deal_context.text,
          deal_context.number,
          deal_context.date,
          deal_context.data_type,
          $1::uuid as deal,
          deal_context.checklist as checklist,
          'Provided'::deal_context_source as source
        FROM
          deal_context
        LEFT JOIN deals_checklists ON deal_context.checklist = deals_checklists.id
  
        WHERE
          deal_context.deal = $1
          AND deals_checklists.deactivated_at IS NULL
          AND deals_checklists.terminated_at  IS NULL
          AND deals_checklists.deleted_at     IS NULL
          AND deal_context.deleted_at         IS NULL
        ORDER BY
        deal_context.deal,
        deal_context.key,
        deal_context.created_at DESC
      ),
  
      mls_context AS (
        SELECT
          NULL::uuid as id,
          'deal_context_item' as type,
          NULL::timestamp with time zone as created_at,
          NULL::uuid AS created_by,
          NULL::uuid as approved_by,
          NULL::timestamp with time zone as approved_at,
          ctx.key,
          ctx.text,
          ctx.number,
          ctx.date,
          ctx.data_type,
          $1::uuid as deal,
          NULL::uuid as checklist,
          'MLS'::deal_context_source as source
        FROM get_mls_context(
          (SELECT listing FROM deals WHERE id = $1)
        ) ctx
      ),
  
      merged AS (
        SELECT * FROM last_deal_context
        UNION ALL
        SELECT * FROM mls_context
      )
  
      SELECT DISTINCT ON(key)
      merged.*,
      definitions.id as definition,
      to_tsvector('english', COALESCE(text, number::text))
      FROM merged
      JOIN definitions ON merged.key = definitions.key
      ORDER BY
        key ASC,
        (
          CASE
            WHEN preffered_source::text = source::text THEN 1
            ELSE 2
          END
        ) ASC;
  
    END;
  $$
  LANGUAGE PLPGSQL`,

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
