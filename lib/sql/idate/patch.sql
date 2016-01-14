UPDATE important_dates
SET title = $1
    due_date = to_timestamp($2)
WHERE id = $3
