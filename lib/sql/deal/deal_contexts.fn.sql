CREATE OR REPLACE FUNCTION deal_context() RETURNS TABLE (
    "id" uuid,
    type text,
    created_at timestamp with time zone,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    key text,
    text text,
    number float,
    date timestamp with time zone,
    context_type deal_context_type,
    submission uuid,
    revision uuid,
    deal uuid
) AS
$$
  SELECT
    DISTINCT ON (deal_context.deal, deal_context.key)
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
  FROM
    deal_context
  LEFT JOIN forms_data ON deal_context.revision = forms_data.id
  LEFT JOIN forms_submissions ON forms_data.submission = forms_submissions.id
  LEFT JOIN tasks ON forms_submissions.id = tasks.submission
  LEFT JOIN deals_checklists ON tasks.checklist = deals_checklists.id
  WHERE
    (
      deal_context.revision IS NULL
      OR
      (
        deals_checklists.deactivated_at IS NULL
        AND
        deals_checklists.terminated_at IS NULL
      )
    )
  ORDER BY
  deal_context.deal,
  deal_context.key,
  deal_context.created_at DESC
$$
LANGUAGE sql