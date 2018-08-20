SELECT emails.*,
  'email' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at
FROM emails
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON emails.id = eid
ORDER BY t.ord
