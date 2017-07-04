  INSERT INTO property_rooms(
    matrix_unique_id,
    matrix_modified_dt,
    description,
    length,
    width,
    features,
    listing_mui,
    level,
    room_type,
    created_at,
    updated_at)
VALUES ($1,
        $2::timestamptz,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        now(),
        now())
ON CONFLICT (matrix_unique_id) DO UPDATE SET
  matrix_modified_dt = $2::timestamptz,
  description = $3,
  length = $4,
  width = $5,
  features = $6,
  listing_mui = $7,
  level = $8,
  room_type = $9,
  updated_at = CLOCK_TIMESTAMP()
  WHERE property_rooms.matrix_unique_id = $1;