UPDATE
  microsoft_messages
SET
  new_message_id = newIds.new_message_id
FROM 
  json_to_recordset($1::json) as newIds(id UUID, message_id text, new_message_id text)
WHERE
  microsoft_messages.id = newIds.id