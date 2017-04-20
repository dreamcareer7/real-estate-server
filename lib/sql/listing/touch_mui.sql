UPDATE recommendations
SET updated_at = CLOCK_TIMESTAMP(),
    last_update = $2::recommendation_last_update
WHERE listing = (SELECT id FROM listings WHERE matrix_unique_id = $1 LIMIT 1)
