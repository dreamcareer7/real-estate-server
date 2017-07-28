SELECT envelopes.*,
       'envelope' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       -- The reason we ORDER recipients and documents
       -- is to make sure the are predictable for tests
       -- That's also a better and more predictable UI
       (
         SELECT ARRAY_AGG(id ORDER BY envelopes_recipients.created_at)
         FROM envelopes_recipients WHERE envelopes_recipients.envelope = envelopes.id
       ) AS recipients,
       (
         WITH docs AS (
          SELECT envelopes_documents.*, forms_data.submission as submission
          FROM envelopes_documents JOIN forms_data ON envelopes_documents.submission_revision = forms_data.id
          WHERE envelopes_documents.envelope = envelopes.id
          ORDER BY envelopes_documents.document_id
         )
         SELECT JSON_AGG(docs.*) FROM docs
       ) AS documents,
       webhook_token
FROM envelopes
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON envelopes.id = eid
ORDER BY t.ord
