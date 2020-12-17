CREATE OR REPLACE VIEW calendar.crm_task AS (
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