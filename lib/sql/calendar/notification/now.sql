SELECT
  c.id,
  c."user",
  c.title,
  c.type_label,
  c.date AS "timestamp",
  extract(epoch from cns.reminder) as reminder,
  cns.object_type,
  cns.event_type,
  cns.reminder,
  c.contact,
  c.deal
FROM
  (
    SELECT
      *
    FROM
      analytics.calendar,
      unnest(analytics.calendar.users) cu("user")
    WHERE
      CASE
        WHEN recurring IS TRUE THEN
          range_contains_birthday(now(), now() + interval '1 month', "timestamp")
        ELSE
          "timestamp" BETWEEN NOW() AND NOW() + interval '1 month'
      END
  ) AS c
  JOIN calendar_notification_settings AS cns
    ON c."user" = cns."user"
  JOIN users u
    ON c."user" = u.id
WHERE
  CASE
    WHEN c.recurring IS TRUE THEN
      range_contains_birthday(now() - interval '44 hours', now(), c.date - cns.reminder)
    ELSE
      (c.date - cns.reminder) between now() - interval '44 hours' and now()
  END
  AND cns.deleted_at IS NULL
  AND c.object_type::calendar_object_type = cns.object_type
  AND c.event_type = cns.event_type
  AND (cns.object_type = 'deal_context' OR cns.object_type = 'contact_attribute')
  AND NOT EXISTS (
    SELECT
      *
    FROM
      calendar_notification_logs cnl
    WHERE
      cnl.id = c.id
      AND cnl.timestamp = c.date
      AND cnl."user" = c."user"
  )
  AND CASE WHEN $1::int IS NULL THEN TRUE ELSE extract('hour' from now() at time zone u.timezone) = $1 END;
