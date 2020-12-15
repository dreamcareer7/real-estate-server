CREATE OR REPLACE VIEW triggers_due AS (
  (
    SELECT
      t.*,
      'contact' AS trigger_object_type,
      c.object_type,
      (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time AS timestamp,
      (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time - interval '3 days' AS due_at
    FROM
      triggers AS t
      JOIN analytics.calendar AS c
        ON t.contact = c.contact
      JOIN users AS u
        ON (t.user = u.id)
    WHERE
      c.object_type = 'contact_attribute'
      AND t.event_type <> 'flow_start'
      AND c.brand = t.brand
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
      JOIN analytics.calendar AS c
        ON t.deal = c.deal
      JOIN users AS u
        ON (t.user = u.id)
    WHERE
      c.object_type = 'deal_context'
      AND t.event_type <> 'flow_start'
      AND c.brand = t.brand
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
      JOIN analytics.calendar AS c
        ON (t.deal = c.deal OR t.contact = c.contact)
      JOIN users AS u
        ON (t.user = u.id)
    WHERE
      c.object_type = 'flow'
      AND c.brand = t.brand
      AND c.event_type = 'flow_start'
      AND t.event_type = 'flow_start'
      AND t.deleted_at IS NULL
      AND t.executed_at IS NULL
      AND t.effective_at <= NOW()
      AND t.failed_at IS NULL
  )
)
