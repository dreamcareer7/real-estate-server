SELECT *,
       'envelope_document' AS type
FROM envelopes_documents
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON envelope_documents.id = did
ORDER BY t.ord
