SELECT
  envelopes_documents.*,
  forms_data.submission as submission,
  'envelope_document' as type,
  (
    SELECT file FROM envelopes_documents_revisions
    WHERE envelope_document = envelopes_documents.id
    ORDER BY created_at DESC
    LIMIT 1
  ) as pdf
FROM envelopes_documents
FULL JOIN forms_data ON envelopes_documents.submission_revision = forms_data.id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON envelopes_documents.id = did
ORDER BY t.ord