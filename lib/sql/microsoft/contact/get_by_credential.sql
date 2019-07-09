SELECT
  id, microsoft_credential, remote_id, data, source
FROM
  microsoft_contacts
WHERE
  microsoft_credential = $1