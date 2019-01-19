SELECT
  c.id,
  c."user",
  c.title,
  c.type_label,
  c.timestamp,
  extract(epoch from cns.reminder) as reminder,
  cns.object_type,
  cns.event_type,
  c.contact,
  c.deal
FROM
  (
    SELECT
      *
    FROM
      analytics.calendar,
      unnest(analytics.calendar.users) cu("user")
  ) AS c
  JOIN calendar_notification_settings AS cns
    USING ("user")
  JOIN users u
    ON c.user = u.id
  LEFT JOIN calendar_notification_logs AS cnl
    ON (c.id = cnl.id AND c."user" = cnl."user")
WHERE
  (c.timestamp - cns.reminder) >= now() - interval '20 hours'
  AND cns.deleted_at IS NULL
  AND c.object_type::calendar_object_type = cns.object_type
  AND c.event_type = cns.event_type
  AND (cns.object_type = 'deal_context' OR cns.object_type = 'contact_attribute')
  AND cnl.id IS NULL
  AND extract('hour' from now() at time zone u.timezone) = $1;
