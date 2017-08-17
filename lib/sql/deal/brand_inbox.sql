SELECT
  DISTINCT deals.id
FROM deals
  JOIN deals_checklists ON deals.id = deals_checklists.deal
  JOIN tasks ON deals_checklists.id = tasks.checklist
WHERE
  tasks.needs_attention = TRUE
  AND
  deals.brand IN (SELECT brand_children($1::uuid))