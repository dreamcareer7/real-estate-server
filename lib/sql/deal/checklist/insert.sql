INSERT INTO deals_checklists (
  title,
  "order",
  deal
) VALUES ($1, $2, $3)
RETURNING id