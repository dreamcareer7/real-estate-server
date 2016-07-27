SELECT
  listings_filters.id AS id,
  (COUNT(*) OVER())::INT AS total
FROM listings_filters
WHERE
  status = ANY($16::listing_status[]) AND
  price >= $1 AND
  price <= $2 AND
  COALESCE(square_meters >= $3, TRUE) = TRUE AND
  COALESCE(square_meters <= $4, TRUE) = TRUE AND
  COALESCE(bedroom_count >= $5, TRUE) = TRUE AND
  (
    (COALESCE(half_bathroom_count,0) + COALESCE(full_bathroom_count, 0)) >= $6 -- Be careful, null + 0 IS NULL
  ) AND
  property_type = $7 AND
  property_subtype = ANY ($8::property_subtype[]) AND
  COALESCE(year_built >= $9, TRUE) = TRUE AND
  COALESCE(year_built <= $10, TRUE) = TRUE AND
  COALESCE(pool_yn = $11, TRUE) = TRUE AND
  COALESCE(lot_square_meters >= $12, TRUE) = TRUE AND
  COALESCE(lot_square_meters <= $13, TRUE) = TRUE AND
  (
    ($14::text IS NULL) OR (
      location IS NOT NULL AND
      ST_Within(location, ST_SetSRID(ST_GeomFromText($14), 4326))
    )
  )
  AND (
    ($18::text IS NULL) OR (
      list_office_mls_id = ANY($18::text[])
    )
  )
  AND (
    ($19::text IS NULL) OR (
      list_agent_mls_id = ANY($19::text[])
    )
  )
  AND (
    ($20::text IS NULL) OR (
      mls_area_major = ANY($20::int[])
    )
  )
  AND (
    ($21::text IS NULL) OR (
      mls_area_minor = ANY($21::int[])
    )
  )
  AND (
    ($15::boolean IS NULL OR $15::boolean = false) OR (
      SELECT count(*) > 0 FROM open_houses WHERE
      listing_mui = listings_filters.matrix_unique_id AND start_time > NOW()
    )
  )
  AND (
    CASE WHEN ((($17::float) IS NULL) OR (listings_filters.status <> 'Sold')) THEN TRUE ELSE (
      CASE WHEN listings_filters.close_date IS NULL THEN FALSE ELSE (
        close_date > to_timestamp($17::float)
    ) END
  ) END
)
-- We might be interested in showing alert results for a specific brokerage first.
-- Also, we might be interested in sorting based on either closed price or listing statuses
ORDER BY
  CASE WHEN $22::text IS NULL OR 'office' <> ALL($23::text[]) THEN 1 ELSE
    CASE WHEN $22::text = list_office_mls_id THEN 0 ELSE 1 END
  END,
  CASE WHEN $23::text IS NULL THEN 1 ELSE
    CASE WHEN 'status' = ANY($23::text[]) THEN order_listings(status) ELSE 1 END
  END ASC,
  CASE WHEN $23::text IS NULL THEN 1 ELSE
    CASE WHEN 'close_price' = ANY($23::text[]) THEN close_price ELSE 1 END
  END DESC,
  CASE WHEN $23::text IS NULL THEN 1 ELSE
    CASE WHEN 'price' = ANY($23::text[]) THEN price ELSE 1 END
  END DESC,
  CASE WHEN $23::text IS NULL THEN 1 ELSE
    CASE WHEN 'created_at' = ANY($23::text[]) THEN created_at ELSE 0 END
  END DESC
LIMIT $24
OFFSET $25
