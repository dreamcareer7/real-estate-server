WITH definition AS (
  SELECT *,

  $6::text AS value,
  cast_context($6::text, data_type::text, 'Text')::text                     AS text,
  cast_context($6::text, data_type::text, 'Date')::timestamp with time zone AS date,
  cast_context($6::text, data_type::text, 'Number')::float                  AS number

  FROM brands_contexts WHERE id = $1
)

INSERT INTO deal_context (
  definition,
  context_type,
  key,
  value,
  text,
  number,
  date,
  deal,
  created_by,
  checklist,
  approved_by,
  approved_at
)
SELECT
  $1,
  (SELECT data_type FROM definition),
  (SELECT key       FROM definition),
  $6::text,
  (SELECT text      FROM definition),
  (SELECT number    FROM definition),
  (SELECT date      FROM definition),
  $2::uuid,
  $3::uuid,
  $4::uuid,
  (CASE WHEN $5::boolean IS FALSE THEN NULL ELSE $2::uuid END),
  (CASE WHEN $5::boolean IS FALSE THEN NULL ELSE CLOCK_TIMESTAMP() END)
  -- We don't want to re-save a context value if it's unchanged.
  -- Because that would mean we will lose some history (approvals, origins, etc)
  -- If we re-insert it.
  -- issue #1111 is an example
WHERE (
  SELECT count(*) < 1 FROM current_deal_context
  WHERE deal   = $1
  AND   key    = (SELECT key    FROM definition)
  AND   text   = (SELECT text   FROM definition)
  AND   number = (SELECT number FROM definition)
  AND   date   = (SELECT date   FROM definition)
)

RETURNING *
