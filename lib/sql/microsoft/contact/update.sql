INSERT INTO microsoft_contacts 
	(microsoft_credential, remote_id, contact, "data", etag, parked)
SELECT 
    microsoft_credential, remote_id, contact, "data", etag, parked
FROM 
    json_populate_recordset(NULL::microsoft_contacts, $1::json)
ON conflict 
	(microsoft_credential, remote_id) 
WHERE 
	deleted_at is null 
DO UPDATE
SET 
	"data" = EXCLUDED."data",
	etag = EXCLUDED.etag,
	parked = EXCLUDED.parked,
	processed_photo = CASE WHEN microsoft_contacts.data->'photo' = EXCLUDED.data->'photo' THEN TRUE ELSE FALSE END,
	updated_at = NOW()
RETURNING
	"id", microsoft_credential, remote_id, contact, "data", etag, parked, "source"