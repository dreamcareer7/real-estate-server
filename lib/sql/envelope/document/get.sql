SELECT *,
  'envelope_document' AS type

FROM envelopes_documents WHERE id = $1