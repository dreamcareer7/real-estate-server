update lead_channels SET
  deleted_at = CLOCK_TIMESTAMP()  
where id = $1

