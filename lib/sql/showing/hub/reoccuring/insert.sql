INSERT INTO showinghub.reocurring_restrictions (
  id,
  showable_listing,
  day_of_week,
  number_of_weeks,
  begin_date,
  start_date,
  end_date
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8
)