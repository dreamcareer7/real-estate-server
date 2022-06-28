update lead_channels SET
    capture_number = capture_number + 1,
    last_capture_date = CLOCK_TIMESTAMP()
where id = $1
