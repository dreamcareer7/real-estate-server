INSERT INTO activities(
  reference,
  reference_type,
  object,
  object_class,
  object_sa,
  action
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
RETURNING id
