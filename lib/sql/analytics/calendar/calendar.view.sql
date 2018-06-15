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
      'deal_context' AS object_type,
      "key" AS event_type,
      NULL AS type_label,
      "date" AS "timestamp",
      False AS recurring,
      get_deal_display_title(deals.id) AS title,
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
      'contact_attribute' AS object_type,
      attribute_type AS event_type,
      (CASE
        WHEN attribute_type = 'birthday' THEN 'Birthday'
        ELSE COALESCE(contacts_attributes.label, 'Important Date')
      END) AS type_label,
      "date" AS "timestamp",
      True AS recurring,
      get_contact_display_name(COALESCE(contacts.parent, contacts.id)) AS title,
      NULL::uuid AS crm_task,
      NULL::uuid AS deal,
      contact,
      contacts."user",
      contacts.brand
    FROM
      contacts
      JOIN contacts_attributes
        ON contacts.id = contacts_attributes.contact
    WHERE
      contacts.deleted_at IS NULL
      AND contacts_attributes.deleted_at IS NULL
      AND (attribute_type = 'important_date' OR attribute_type = 'birthday')
  )