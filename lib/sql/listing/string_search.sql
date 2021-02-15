SELECT id, (COUNT(*) OVER())::INT as total
FROM search_listings(to_tsquery('english', $1))
WHERE
  CASE
    WHEN $2::listing_status[] IS NULL THEN TRUE
    ELSE status = ANY($2::listing_status[])
  END
ORDER BY order_listings(status)
LIMIT COALESCE($3, 50)
