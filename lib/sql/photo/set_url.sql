UPDATE photos SET last_processed = CLOCK_TIMESTAMP(), url = $1 WHERE matrix_unique_id = $2;
