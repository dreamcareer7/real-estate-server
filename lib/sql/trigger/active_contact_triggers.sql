-- $1: contactIds
-- $2: eventTypes (optional)
-- $3: actions (optional)
-- $4: hasFlow (optional)

SELECT
  id,
  flow
FROM
  triggers
WHERE
  deleted_at IS NULL
  AND (executed_at IS NULL OR executed_at > now() - '3 days'::interval)
  AND contact = ANY($1::uuid[])
  AND ($2::text[] IS NULL OR event_type = ANY($2::text[]))
  AND ($3::text[] IS NULL OR action = ANY($3::text[]))
  AND (CASE
         WHEN $4::boolean THEN flow IS NOT NULL
         WHEN NOT $4::boolean THEN flow IS NULL
         ELSE TRUE
       END)
