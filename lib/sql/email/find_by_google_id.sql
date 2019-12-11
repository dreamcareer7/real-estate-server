SELECT
  id, campaign, google_id
FROM
  emails
JOIN
  unnest($1::text[]) WITH ORDINALITY t(gid, ord) ON emails.google_id = gid
ORDER BY t.ord
