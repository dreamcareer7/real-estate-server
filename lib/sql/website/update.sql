INSERT INTO websites_snapshots
  (template, brand, attributes, created_at, title, template_instance, website)
VALUES
  ($1, $2, $3, CLOCK_TIMESTAMP(), $4, $5, $6)
