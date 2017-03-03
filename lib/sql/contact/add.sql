INSERT INTO contacts
(
  "user",
  ios_address_book_id,
  android_address_book_id
)
VALUES
(
  $1,
  $2,
  $3
)
RETURNING id
