INSERT INTO
  flows (
    created_by,
    updated_by,
    brand,
    origin,
    name,
    description,
    starts_at,
    last_step_date,
    contact
  )
SELECT
  $1::uuid,
	$2::uuid,
	$3::uuid,
	$4::uuid,
	$5::text,
	$6::text,
	$7::timestamp,
	$8::timestamp,
	UNNEST($9::uuid[])
RETURNING
  id
