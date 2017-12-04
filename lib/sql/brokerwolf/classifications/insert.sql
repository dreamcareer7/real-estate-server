INSERT INTO brokerwolf_classifications (brokerwolf_id, object) VALUES ($1, $2)
ON CONFLICT (brokerwolf_id) DO UPDATE SET
object = $2
WHERE brokerwolf_classifications.brokerwolf_id = $1