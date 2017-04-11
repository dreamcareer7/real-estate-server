UPDATE photos SET
  to_be_processed_at = NULL,
  processed_at = CLOCK_TIMESTAMP(),
  error = $1
WHERE matrix_unique_id = $2;
