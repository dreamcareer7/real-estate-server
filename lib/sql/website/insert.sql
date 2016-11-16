WITH inserted AS (
  INSERT INTO websites ("user") VALUES ($2)
  RETURNING id
)

INSERT INTO websites_snapshots
  (brand, template, attributes, website)
VALUES ($3,$1, $4, (SELECT id FROM inserted))
RETURNING (SELECT id FROM inserted)