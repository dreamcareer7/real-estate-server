INSERT INTO deals_checklists (
  title,
  "order",
  deal,
  origin
) VALUES ($1, $2, $3, $4)
RETURNING id