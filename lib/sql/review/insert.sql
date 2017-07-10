WITH review AS (
  INSERT INTO reviews DEFAULT VALUES
  RETURNING id
)

INSERT INTO reviews_history (review, created_by)
VALUES (
  (SELECT id FROM review),
  $1
)

RETURNING (SELECT id FROM review) as id