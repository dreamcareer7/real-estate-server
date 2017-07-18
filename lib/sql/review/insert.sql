WITH review AS (
  INSERT INTO reviews DEFAULT VALUES
  RETURNING id
)

INSERT INTO reviews_history (review, created_by, status)
VALUES (
  (SELECT id FROM review),
  $1,
  $2
)

RETURNING (SELECT id FROM review) as id