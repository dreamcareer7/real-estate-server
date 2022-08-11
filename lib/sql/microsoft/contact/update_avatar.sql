INSERT INTO microsoft_contacts 
	(microsoft_credential, remote_id, photo, processed_photo)
SELECT 
    t.microsoft_credential, t.remote_id, t.photo, t.processed_photo
FROM 
	json_to_recordset($1::json) as t(microsoft_credential UUID, remote_id text, photo text, processed_photo bool)
ON conflict 
	(microsoft_credential, remote_id) 
WHERE 
	deleted_at is null 
DO UPDATE
SET 
	photo = EXCLUDED.photo,
	processed_photo = EXCLUDED.processed_photo,
	updated_at = NOW()
RETURNING
	"id"