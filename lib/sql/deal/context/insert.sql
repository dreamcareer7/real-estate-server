INSERT INTO deal_context (
  deal,
  created_by,
  context_type,
  revision,
  approved_by,
  approved_at,
  key,
  value,
  text,
  number,
  date
) VALUES (
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
)