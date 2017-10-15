INSERT INTO deal_context (
  deal,
  created_by,
  context_type,
  revision,
  key,
  value,
  text,
  number,
  date
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  (CASE WHEN $6 = 'Text'   THEN $6::text ELSE NULL END),
  (CASE WHEN $6 = 'Number' THEN $6::float ELSE NULL END),
  (CASE WHEN $6 = 'Date'   THEN $6::timestamp with time zone ELSE NULL END)
)