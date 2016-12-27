SELECT *,
  'envelope' AS type,
   EXTRACT(EPOCH FROM created_at) AS created_at,
   EXTRACT(EPOCH FROM updated_at) AS updated_at,

   (
    SELECT ARRAY_AGG(id) FROM envelopes_recipients WHERE envelopes_recipients.envelope = envelopes.id
   ) AS recipients,

   (
    SELECT JSON_AGG(envelopes_documents) FROM envelopes_documents WHERE envelopes_documents.envelope = envelopes.id
   ) AS documents,

   webhook_token

FROM envelopes WHERE id = $1