SELECT deals.*,
  'deal' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  faired_at IS NULL as is_draft,
  (
    SELECT ARRAY_AGG(deals_roles.id ORDER BY deals_roles.created_at ASC)
    FROM deals_roles
    LEFT JOIN deals_checklists ON deals_roles.checklist = deals_checklists.id
    WHERE deals_roles.deal = deals.id
    AND deals_roles.deleted_at          IS NULL
    AND deals_checklists.deleted_at     IS NULL
    AND deals_checklists.terminated_at  IS NULL
    AND deals_checklists.deactivated_at IS NULL
  ) AS roles,
  (
    SELECT ARRAY_AGG(id ORDER BY "order") FROM deals_checklists
    WHERE deal = deals.id AND deleted_at IS NULL
  ) as checklists,

  (
    WITH c AS (
      SELECT
        *,
        EXTRACT(EPOCH FROM date) as date

      FROM current_deal_context
      WHERE deal = deals.id
      AND   deleted_at IS NULL
    )

    SELECT
      JSON_OBJECT_AGG(c.key, c.*)
    FROM c
  ) as context,

  (
    SELECT ARRAY_AGG(id ORDER BY created_at DESC) FROM envelopes WHERE deal = deals.id
  ) as envelopes,

  CASE WHEN $2::uuid IS NULL THEN
    NULL
  ELSE
  (
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT
        (
          'id', id,
          'notification_type', (subject_class::text || action || object_class::text),
          'room', room,
          'message', message,
          'type', 'notification_summary'
        )
      ) FROM new_notifications nn
    WHERE nn.user = $2
    AND (
      (
        nn.auxiliary_object_class = 'Deal'
        AND
        nn.auxiliary_object = deals.id
      )
      OR
      (
        nn.auxiliary_subject_class = 'Deal'
        AND
        nn.auxiliary_subject = deals.id
      )
      OR
      (
        nn.subject_class = 'Deal'
        AND
        nn.subject = deals.id
      )
    )
    AND (nn.room IS NULL OR nn.room NOT IN(
      SELECT room FROM tasks
        WHERE checklist IN (SELECT id FROM deals_checklists WHERE deal = deals.id)
        AND deleted_at IS NOT NULL
    ))
  )
  END AS new_notifications,

  (
    SELECT
      ARRAY_AGG(DISTINCT COALESCE(brands_checklists_tasks.tab_name, forms.tab_name, brands_checklists.tab_name))
    FROM tasks
    JOIN deals_checklists             ON tasks.checklist = deals_checklists.id
    JOIN brands_checklists            ON deals_checklists.origin = brands_checklists.id
    LEFT JOIN brands_checklists_tasks ON tasks.origin = brands_checklists_tasks.id
    LEFT JOIN forms                   ON tasks.form = forms.id
    WHERE
      deals_checklists.deal = deals.id
      AND deals_checklists.deleted_at IS NULL
      AND tasks.attention_requested_at IS NOT NULL
      AND tasks.deleted_at IS NULL
  ) as inboxes,

  (
    SELECT
      COUNT(*)::INT
    FROM tasks
    JOIN deals_checklists  ON tasks.checklist = deals_checklists.id
    WHERE
      deals_checklists.deal = deals.id
      AND deals_checklists.terminated_at  IS NULL
      AND deals_checklists.deactivated_at IS NULL
      AND deals_checklists.deleted_at IS NULL
      AND tasks.attention_requested_at IS NOt NULL
      AND tasks.deleted_at IS NULL
  ) as attention_requests,

  -- The logic for this part is a bit complex.
  -- Basically, backoffice needs to know when this deal was submitted.
  -- And we calculate the first time tht the first task was submitted on.
  -- So, so far, we need the earliest task that was submmited.
  -- That's calculated in the window function.
  -- However, there's a neat complexity:
  -- If the deal was a draft at the time of submission,
  -- Then the real time it was submitted would be the time it went live.
  -- That's why we have that GREATEST statement.
  -- Please note that if there's nothing submitted, then attention_requested_at
  -- Is expected to be NULL, hence that IS NULL check
  -- More explanation at server#1146
  (
    WITH earliest_task AS (
      SELECT
        MIN(attention_requested_at) as attention_requested_at
      FROM tasks
      JOIN deals_checklists  ON tasks.checklist = deals_checklists.id
      WHERE
        deals_checklists.deal = deals.id
        AND deals_checklists.terminated_at  IS NULL
        AND deals_checklists.deactivated_at IS NULL
        AND deals_checklists.deleted_at IS NULL
        AND tasks.attention_requested_at IS NOT NULL
        AND tasks.deleted_at IS NULL
    )
    SELECT
      CASE WHEN (SELECT attention_requested_at FROM earliest_task) IS NULL THEN NULL
      ELSE GREATEST(
        EXTRACT(EPOCH FROM (SELECT attention_requested_at FROM earliest_task)),
        EXTRACT(EPOCH FROM deals.faired_at)
      )
      END
  ) as attention_requested_at,

  (
    SELECT count(*) > 0 FROM deals_checklists
    JOIN brands_checklists ON deals_checklists.origin = brands_checklists.id
    WHERE
      deals_checklists.deal = deals.id
      AND deals_checklists.deactivated_at IS NULL
      AND deals_checklists.terminated_at  IS NULL
      AND deals_checklists.deleted_at IS NULL
      AND brands_checklists.checklist_type = 'Offer'
  ) as has_active_offer,

  (
    SELECT
      ARRAY_AGG(id)
    FROM
      role_files
    WHERE
      "role" = 'Deal'
      AND role_id = deals.id
  ) AS files,

  (
    SELECT
      ARRAY_AGG(id)
    FROM
      triggers
    WHERE
      triggers.deal = deals.id
      AND deleted_at IS NULL
      AND executed_at IS NULL
  )

FROM deals
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON deals.id = did
ORDER BY t.ord
