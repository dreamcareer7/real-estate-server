WITH review AS (
  INSERT INTO reviews
  (deal, file, envelope, envelope_document) VALUES ($1, $2, $3, $4)
  RETURNING id
)

INSERT INTO reviews_history (review, created_by, state, comment) VALUES ((SELECT id FROM review), $5, $6, $7)
RETURNING review as id
