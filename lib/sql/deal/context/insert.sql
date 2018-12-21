INSERT INTO deal_context (
  deal,
  created_by,
  context_type,
  checklist,
  approved_by,
  approved_at,
  key,
  value,
  text,
  number,
  date
)
SELECT
  $1,
  $2::uuid,
  $3::deal_context_type,
  $4,
  (CASE WHEN $5::boolean IS FALSE THEN NULL ELSE $2::uuid END),
  (CASE WHEN $5::boolean IS FALSE THEN NULL ELSE CLOCK_TIMESTAMP() END),
  $6,
  $7,
  (CASE WHEN $3 = 'Text'   THEN $7::text ELSE NULL END),
  (CASE WHEN $3 = 'Number' THEN $7::float ELSE NULL END),
  (CASE WHEN $3 = 'Date'   THEN $7::timestamp with time zone ELSE NULL END)
  -- We don't want to re-save a context value if it's unchanged.
  -- Because that would mean we will lose some history (approvals, origins, etc)
  -- If we re-insert it.
  -- issue #1111 is an example
WHERE (
  SELECT count(*) < 1 FROM current_deal_context
  WHERE
  deal       = $1
  AND key    = $7
  AND text   = (CASE WHEN $3 = 'Text'   THEN $7::text ELSE NULL END)
  AND number = (CASE WHEN $3 = 'Number' THEN $7::float ELSE NULL END)
  AND date   = (CASE WHEN $3 = 'Date'   THEN $7::timestamp with time zone ELSE NULL END)
)

RETURNING *
