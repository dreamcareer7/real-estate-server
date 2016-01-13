UPDATE important_dates
SET title = $1
    due_date = to_timstamp($2)
WHERE id = $3
