CREATE OR REPLACE FUNCTION update_current_deal_context()
  RETURNS trigger AS
$$
  BEGIN
    DELETE FROM current_deal_context WHERE deal = NEW.deal;

    INSERT INTO current_deal_context
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
      deal_context.deal = NEW.deal
      AND (
        deal_context.revision IS NULL
        OR
        (
          deals_checklists.deactivated_at IS NULL
          AND
          deals_checklists.terminated_at IS NULL
        )
      )
      AND
      tasks.deleted_at IS NULL
    ORDER BY
    deal_context.deal,
    deal_context.key,
    deal_context.created_at DESC;

    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;
