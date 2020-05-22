WITH p AS (
  SELECT ARRAY[a, b] AS pair
  FROM contacts_duplicate_pairs
  WHERE brand = $1
    AND ignored_at > $2::timestamptz
)
SELECT DISTINCT unnest AS id
FROM p, unnest(p.pair)
