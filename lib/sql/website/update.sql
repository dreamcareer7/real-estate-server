INSERT INTO websites_snapshots
  (template, brand, attributes, website, created_at)
VALUES
  ($1, $2, $3, $4, statement_timestamp())

-- We user statement_timestamp() instead of NOW() because NOW() uses the current transaction's time
-- On our unit tests, we use the same transaction for a lot of endpoint calls and that messes with them
