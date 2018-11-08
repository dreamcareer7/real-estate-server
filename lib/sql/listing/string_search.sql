SELECT id FROM search_listings($1::text)
WHERE
  CASE
    WHEN $2::listing_status[] IS NULL THEN TRUE
    ELSE status = ANY($2::listing_status[])
  END
ORDER BY order_listings(status)
LIMIT $3
