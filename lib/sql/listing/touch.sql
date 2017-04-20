UPDATE recommendations
SET updated_at = CLOCK_TIMESTAMP(),
    last_update = $2::recommendation_last_update
WHERE listing = $1
