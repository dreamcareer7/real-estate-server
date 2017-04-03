
INSERT INTO rooms_users ("user", room, reference)
VALUES (
  $1,
  $2,
  $3
)

ON CONFLICT (room, "user") DO UPDATE SET
  reference = $3