SELECT
  reminders.*
FROM
  reminders
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON reminders.id = did
ORDER BY t.ord
