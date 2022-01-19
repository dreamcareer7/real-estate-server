INSERT INTO microsoft_contacts 
	(microsoft_credential, remote_id, contact, "data", etag, parked)
SELECT 
    microsoft_credential, remote_id, contact, "data", etag, parked
FROM 
    json_populate_recordset(null::microsoft_contacts, $1::json)
ON conflict 
	(microsoft_credential, remote_id) 
WHERE 
	deleted_at is null 
DO UPDATE
SET 
    contact = EXCLUDED.contact,
	etag = EXCLUDED.etag,
	"data" = EXCLUDED."data",
	parked = EXCLUDED.parked,
	updated_at = NOW()
RETURNING
	"id", microsoft_credential, remote_id, contact, "data", etag, parked, "source"