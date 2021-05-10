WITH added AS (
  INSERT INTO showings (
    /*  $2 */ created_by,
    /*  $2 */ updated_by,
    /*  $3 */ brand,
    /*  $4 */ start_date,
    /*  $5 */ end_date,
    /*  $6 */ aired_at,
    /*  $7 */ duration,
    /*  $8 */ same_day_allowed,
    /*  $9 */ notice_period,
    /* $10 */ approval_type,
    /* $11 */ feedback_template,
    /* $12 */ deal,
    /* $13 */ listing,
    /* $14 */ address,
    /* $15 */ gallery,
    /* $16 */ allow_appraisal,
    /* $17 */ allow_inspection,
    /* $18 */ instructions,
    /* $19 */ title
  ) VALUES (
    $2::uuid,
    $2::uuid,
    $3::uuid,
    $4::timestamptz,
    $5::timestamptz,
    $6::timestamp,
    $7::int * '1 second'::interval,
    $8::boolean,
    $9::int * '1 second'::interval,
    $10::showing_approval_type,
    $11::uuid,
    $12::uuid,
    $13::uuid,
    JSON_TO_STDADDR($14::jsonb),
    $15::uuid,
    $16::boolean,
    $17::boolean,
    $18,
    $19
  )
  RETURNING
    id
), rules AS (
  INSERT INTO showings_availabilities (
    showing,
    weekday,
    availability
  ) SELECT
    added.id,
    sr.weekday,
    sr.availability::int4range
  FROM
    json_to_recordset($1::json) AS sr (
      weekday iso_day_of_week,
      availability int4range
    )
    CROSS JOIN added
)
SELECT id FROM added
