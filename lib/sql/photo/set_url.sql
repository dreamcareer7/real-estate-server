UPDATE photos SET
  to_be_processed_at = NULL,
  processed_at = CLOCK_TIMESTAMP(),
  url = $1
WHERE matrix_unique_id = $2;
