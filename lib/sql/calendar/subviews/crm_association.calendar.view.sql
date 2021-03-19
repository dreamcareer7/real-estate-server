CREATE OR REPLACE VIEW calendar.crm_association AS (
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
)
