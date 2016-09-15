WITH normal_results AS ( -- Normal FULL TEXT search on the query --
  SELECT id FROM listings_filters
  WHERE
    to_tsvector('english', address) @@ plainto_tsquery('english', $1)
    OR
    address ILIKE '%' || $1 || '%'
    OR mls_number = $1
  LIMIT 75
),

-- From here we will try to come up with suggestions (of misspellings) in a few different steps --

unnested_query AS ( -- Unnest the query to multiple rows, so 'dallasives' becomes 3 rows, 'caste', 'bend', 'drive'
  SELECT unnest(string_to_array($1, ' ')) as word
),

suggested_parts AS ( -- Find a suggestion for each word --
  SELECT array_agg(
    (
      SELECT
        word
        FROM words
        WHERE word % unnested_query.word
        ORDER BY (similarity(word, unnested_query.word) * occurances) DESC LIMIT 1
    )
  ) as suggestion
  FROM unnested_query
),

suggested_results AS (
  SELECT id FROM listings_filters
  WHERE
    to_tsvector('english', address) @@ plainto_tsquery('english', array_to_string( (SELECT * FROM suggested_parts), ' ') )
  LIMIT 75
),

results AS (
  SELECT * FROM normal_results
  UNION
  SELECT * FROM suggested_results WHERE (SELECT count(*) FROM normal_results) < 1
)


SELECT listings_filters.id
FROM listings_filters
JOIN results ON listings_filters.id = results.id
WHERE
  CASE
    WHEN $2::listing_status[] IS NULL THEN TRUE
    ELSE status = ANY($2::listing_status[])
  END
ORDER BY order_listings(status);