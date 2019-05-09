UPDATE showings
SET 
    showing_start_date = $1,
    showing_end_date = $2,
    result = $3
WHERE
    agent = $4