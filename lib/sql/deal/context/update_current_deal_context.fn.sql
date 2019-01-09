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
      deal_context.data_type,
      deal_context.deal as deal,
      deal_context.checklist as checklist
    FROM
      deal_context
    LEFT JOIN deals_checklists ON deal_context.checklist = deals_checklists.id

    WHERE
      deal_context.deal = NEW.deal
      AND deals_checklists.deactivated_at IS NULL
      AND deals_checklists.terminated_at  IS NULL
      AND deals_checklists.deleted_at     IS NULL
    ORDER BY
    deal_context.deal,
    deal_context.key,
    deal_context.created_at DESC;

    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;
