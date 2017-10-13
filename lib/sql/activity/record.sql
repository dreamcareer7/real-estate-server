INSERT INTO activities(
  reference,
  reference_type,
  object,
  object_class,
  object_sa,
  action,
  is_visible
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
RETURNING id
