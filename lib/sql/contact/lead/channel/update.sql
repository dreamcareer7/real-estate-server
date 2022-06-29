update lead_channels SET
    brand = $2,
    updated_at = CLOCK_TIMESTAMP(),
    capture_number = 0,
    last_capture_date = null
where id = $1

