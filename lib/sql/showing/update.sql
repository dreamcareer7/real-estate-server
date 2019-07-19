UPDATE showings
SET 
    result = $1,
    feedback_text = $2
WHERE
    id = $3