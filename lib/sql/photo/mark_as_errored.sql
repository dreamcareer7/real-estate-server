UPDATE photos SET last_processed = CLOCK_TIMESTAMP(), error = $1 WHERE matrix_unique_id = $2;
