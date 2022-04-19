WITH acl AS (
  SELECT * FROM deals_acl($2::uuid) WHERE $2 IS NOT NULL
)

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

LEFT JOIN tasks            ON envelopes_documents.task                = tasks.id
LEFT JOIN deals_checklists ON tasks.checklist                         = deals_checklists.id
LEFT JOIN acl              ON deals_checklists.deal                   = acl.deal
FULL JOIN forms_data       ON envelopes_documents.submission_revision = forms_data.id

JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON envelopes_documents.id = did

WHERE (
  $2 IS NULL
  OR tasks.id IS NULL
  OR tasks.acl @> ARRAY[acl.acl]
)


ORDER BY t.ord
