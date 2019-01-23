SELECT
  deal_context.id,
  'deal_context_item'::text as type,
  EXTRACT(EPOCH FROM deal_context.created_at) AS created_at,
  EXTRACT(EPOCH FROM deal_context.approved_at) AS approved_at,
  EXTRACT(EPOCH FROM deal_context.date) AS date,
  deal_context.created_by,
  deal_context.approved_by,
  deal_context.key,
  deal_context.text,
  deal_context.number,
  deal_context.data_type,
--   forms_submissions.id as submission,
--   forms_data.id as revision,
  deal_context.deal as deal,
  deal_context.checklist,
  deal_context.definition

FROM deal_context
-- LEFT JOIN forms_data ON deal_context.revision = forms_data.id
-- LEFT JOIN forms_submissions ON forms_data.submission = forms_submissions.id
-- LEFT JOIN tasks ON forms_submissions.id = tasks.submission

JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON deal_context.id = cid
ORDER BY t.ord
