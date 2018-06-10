CREATE OR REPLACE VIEW analytics.calendar AS (
  SELECT
    id,
    'crm_task' AS event_type,
    due_date AS "timestamp",
    False AS recurring,
    title,
    id AS crm_task,
    NULL::uuid AS deal,
    NULL::uuid AS contact,
    assignee AS "user",
    brand
  FROM
    crm_tasks
  WHERE
    deleted_at IS NULL
  )
  UNION ALL
  (
    SELECT
      current_deal_context.id,
      'deal_context' AS event_type,
      "date" AS "timestamp",
      False AS recurring,
      "key" AS title,
      NULL::uuid AS crm_task,
      deal,
      NULL::uuid AS contact,
      NULL::uuid AS "user",
      brand
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
      contacts_attributes.id,
      'contact_attribute' AS event_type,
      "date" AS "timestamp",
      True AS recurring,
      (CASE
        WHEN name = 'birthday' THEN 'Birthday'
        ELSE COALESCE(contacts_attributes.label, 'Important Date')
      END) AS title,
      NULL::uuid AS crm_task,
      NULL::uuid AS deal,
      contact,
      contacts."user",
      contacts.brand
    FROM
      contacts
      JOIN contacts_attributes
        ON contacts.id = contacts_attributes.contact
      JOIN contacts_attribute_defs
        ON contacts_attributes.attribute_def = contacts_attribute_defs.id
    WHERE
      contacts.deleted_at IS NULL
      AND contacts_attributes.deleted_at IS NULL
      AND name = 'birthday' OR name = 'important_date'
  )