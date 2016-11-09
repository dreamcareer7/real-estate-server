INSERT INTO websites (
  template,
  "user",
  brand,
  attributes
) VALUES (
$1,
$2,
$3,
$4
)
RETURNING id