SELECT
  deal_context.id,
  'deal_context_item'::text as type,
  deal_context.created_at,
  deal_context.created_by,
  deal_context.approved_by,
  deal_context.approved_at,
  deal_context.key,
  deal_context.text,
  deal_context.number,
  deal_context.date,
  deal_context.context_type,
  forms_submissions.id as submission,
  forms_data.id as revision,
  deal_context.deal as deal

FROM deal_context
LEFT JOIN forms_data ON deal_context.revision = forms_data.id
LEFT JOIN forms_submissions ON forms_data.submission = forms_submissions.id
LEFT JOIN tasks ON forms_submissions.id = tasks.submission

JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON deal_context.id = cid
ORDER BY t.ord
