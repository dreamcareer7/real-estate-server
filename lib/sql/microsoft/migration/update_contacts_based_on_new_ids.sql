UPDATE
  microsoft_contacts
SET
  new_remote_id = newIds.new_remote_id
FROM 
  json_to_recordset($1::json) as newIds(id UUID, remote_id text, new_remote_id text)
WHERE
  microsoft_contacts.id = newIds.id