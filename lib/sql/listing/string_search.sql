SELECT id
FROM listings_filters
WHERE
    (
      to_tsvector('english', address) @@ plainto_tsquery('english', $1)
      OR
      address ILIKE '%' || $1 || '%'
    )
    AND (
      CASE
        WHEN $2::listing_status[] IS NULL THEN TRUE
        ELSE status = ANY($2::listing_status[])
      END
    )
LIMIT 10
