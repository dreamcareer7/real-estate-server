INSERT INTO microsoft_contacts 
	(microsoft_credential, remote_id, contact, "data", etag, parked)
SELECT 
    t.microsoft_credential, t.remote_id, t.contact, t."data", t.etag, t.parked
FROM
	json_to_recordset($1::json) as t(microsoft_credential UUID, remote_id text, contact UUID, "data" jsonb, etag text, parked bool)
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