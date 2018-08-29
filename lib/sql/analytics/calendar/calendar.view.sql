CREATE OR REPLACE VIEW analytics.calendar AS (
  SELECT
    id,
    'crm_task' AS object_type,
    task_type AS event_type,
    task_type AS type_label,
    due_date AS "timestamp",
    False AS recurring,
    title,
    id AS crm_task,
    NULL::uuid AS deal,
    NULL::uuid AS contact,
    assignee AS "user",
    NULL AS brand,
    status
  FROM
    crm_tasks
  WHERE
    deleted_at IS NULL
  )
  UNION ALL
  (
    SELECT
      current_deal_context.id,
      'deal_context' AS object_type,
      "key" AS event_type,
      NULL AS type_label,
      "date" AS "timestamp",
      False AS recurring,
      deals.title,
      NULL::uuid AS crm_task,
      deal,
      NULL::uuid AS contact,
      NULL::uuid AS "user",
      brand,
      NULL::text AS status
    FROM
      current_deal_context
      JOIN deals
        ON current_deal_context.deal = deals.id
    WHERE
      deals.deleted_at IS NULL
      AND context_type = 'Date'::deal_context_type
  )
  UNION ALL
  (
    SELECT
      ca.id,
      'contact_attribute' AS object_type,
      COALESCE(cad.name, cad.label) AS event_type,
      (CASE
        WHEN attribute_type = 'birthday' THEN 'Birthday'
        ELSE COALESCE(ca.label, 'Important Date')
      END) AS type_label,
      "date" AS "timestamp",
      True AS recurring,
      contacts.display_name AS title,
      NULL::uuid AS crm_task,
      NULL::uuid AS deal,
      contact,
      contacts."user",
      contacts.brand,
      NULL::text AS status
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