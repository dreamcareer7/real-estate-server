INSERT INTO realtor_contacts(
    contact,
    "raw"
) VALUES (
  $1,
  $2
)
ON CONFLICT (contact) DO UPDATE SET
  "raw" = $2
RETURNING id
å