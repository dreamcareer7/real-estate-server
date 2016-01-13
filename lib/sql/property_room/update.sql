UPDATE property_rooms
  SET matrix_unique_id = $1,
      matrix_modified_dt = $2,
      description = $3,
      length = $4,
      width = $5,
      features = $6,
      listing_mui = $7,
      listing = $8,
      level = $9,
      type = $10,
      updated_at = now()
WHERE id = $11