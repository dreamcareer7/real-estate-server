UPDATE brands_checklists SET
  title = $2,
  checklist_type = $3,
  property_type = $4,
  "order" = $5,
  is_terminatable = $6,
  is_deactivatable = $7,
  tab_name = $8
WHERE id = $1
