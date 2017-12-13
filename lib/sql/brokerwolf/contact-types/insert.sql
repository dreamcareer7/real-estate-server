INSERT INTO brokerwolf_contact_types (brokerwolf_id, object) VALUES ($1, $2)
ON CONFLICT (brokerwolf_id) DO UPDATE SET
object = $2
WHERE brokerwolf_contact_types.brokerwolf_id = $1