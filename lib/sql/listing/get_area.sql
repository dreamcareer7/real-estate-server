SELECT id
FROM listings_filters
WHERE
  (
    ($1::text IS NULL) OR (
      mls_area_major = ANY($1::int[])
    )
  )
  AND (
    ($2::text IS NULL) OR (
      mls_area_major = ANY($2::int[])
    )
  )
  AND CASE
    WHEN $3::listing_status[] IS NULL THEN TRUE
    ELSE status = ANY($3::listing_status[])
  END
ORDER BY order_listings(status)
LIMIT 75;