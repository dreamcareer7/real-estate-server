WITH fulltext_results AS ( -- Normal FULL TEXT search on the query --
  SELECT id FROM listings_filters
  WHERE
    to_tsvector('english', address) @@ plainto_tsquery('english', $1)
),

fuzzy_results AS ( -- Just an ILIKE search on the query --
  SELECT id FROM listings_filters
  WHERE address ILIKE '%' || $1 || '%'
),

-- From here we will try to come up with suggestions in a few different steps --

unnested_query AS ( -- Unnest the query to multiple rows, so 'castle bend drives' becomes 3 rows, 'caste', 'bend', 'drive'
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
),

normal_results AS (
  SELECT * FROM fulltext_results
  UNION
  SELECT * FROM fuzzy_results
),

all_results AS (
  SELECT id, status
  FROM listings_filters
  WHERE
    (
      CASE WHEN
        (SELECT count(*) FROM normal_results) > 0 -- If there are any normal results
      THEN id IN (SELECT * FROM normal_results)   -- Return them
      ELSE id IN (SELECT * FROM suggested_results) -- Otherwise, return results found by misspelled suggestions
      END
    )
    AND
    CASE
      WHEN $2::listing_status[] IS NULL THEN TRUE
      ELSE status = ANY($2::listing_status[])
    END
)

SELECT id FROM all_results
ORDER BY order_listings(status)
LIMIT 75;