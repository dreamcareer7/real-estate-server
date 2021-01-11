INSERT INTO contact_integration (
  google_id,
  microsoft_id,
  contact,
  origin,
  etag,
  local_etag
)
SELECT
  google_id,
  microsoft_id,
  contact,
  origin,
  etag,
  local_etag
FROM json_populate_recordset(NULL::contact_integration, $1::json)
RETURNING id, google_id, microsoft_id, contact, origin, etag, local_etag