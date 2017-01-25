INSERT INTO contacts_activities(
  contact,
  subject,
  subject_class,
  subject_sa,
  action
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5
)
RETURNING id
