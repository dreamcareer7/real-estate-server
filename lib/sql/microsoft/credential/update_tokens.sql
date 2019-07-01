UPDATE
  microsoft_credentials
SET
  access_token = $1,
  refresh_token = $2,
  id_token = $3,
  id_toexpires_inken = $4,
  ext_expires_in = $5
WHERE
  id = $6