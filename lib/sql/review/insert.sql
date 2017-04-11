WITH review AS (
  INSERT INTO reviews
  (deal, file, envelope_document) VALUES ($1, $2, $3)
  RETURNING id
)

INSERT INTO reviews_history (review, created_by, state, comment) VALUES ((SELECT id FROM review), $4, $5, $6)
RETURNING review as id
