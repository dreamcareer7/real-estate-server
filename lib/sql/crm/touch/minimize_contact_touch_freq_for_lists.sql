-- $1 members: json array: {contact: UUID, list: UUID}[]

UPDATE contacts AS c SET
  touch_freq = least(c.touch_freq, cl.touch_freq)
FROM
  json_to_recordset($1::json) AS m(contact uuid, list uuid)
  JOIN crm_lists AS cl ON cl.id = m.list
WHERE
  c.id = m.contact AND
  c.deleted_at IS NULL AND
  cl.deleted_at IS NULL AND  
  cl.touch_freq IS NOT NULL
