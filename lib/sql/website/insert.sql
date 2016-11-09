INSERT INTO websites (
  template,
  "user",
  attributes
) VALUES (
$1,
$2,
$3
)
RETURNING id