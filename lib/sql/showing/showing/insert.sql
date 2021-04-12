WITH added AS (
  INSERT INTO showings (
    /*  $3 */ created_by,
    /*  $3 */ updated_by,
    /*  $4 */ brand,
    /*  $5 */ start_date,
    /*  $6 */ end_date,
    /*  $7 */ aired_at,
    /*  $8 */ duration,
    /*  $9 */ notice_period,
    /* $10 */ approval_type,
    /* $11 */ feedback_template,
    /* $12 */ deal,
    /* $13 */ listing,
    /* $14 */ address,
    /* $15 */ gallery,
    /* $16 */ allow_appraisal,
    /* $17 */ allow_inspection,
    /* $18 */ instructions
  ) VALUES (
    $3::uuid,
    $3::uuid,
    $4::uuid,
    $5::timestamptz,
    $6::timestamptz,
    $7::timestamp,
    $8::int * '1 second'::interval,
    $9::int * '1 second'::interval,
    $10::showing_approval_type,
    $11::uuid,
    $12::uuid,
    $13::uuid,
    JSON_TO_STDADDR($14::jsonb),
    $15::uuid,
    $16::boolean,
    $17::boolean,
    $18
  )
  RETURNING
    id
), roles AS (
  INSERT INTO showings_roles (
    created_by,
    showing,
    role,
    "user",
    brand,
    can_approve,
    confirm_notification_type,
    cancel_notification_type,
    first_name,
    last_name,
    email,
    phone_number
  ) SELECT
    $3::uuid,
    added.id,
    sr.*
  FROM
    json_to_recordset($1::json) AS sr (
      role deal_role,
      "user" uuid,
      brand uuid,
      can_approve boolean,
      confirm_notification_type notification_delivery_type[],
      cancel_notification_type notification_delivery_type[],
      first_name text,
      last_name text,
      email text,
      phone_number text
    )
    CROSS JOIN added
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
    json_to_recordset($2::json) AS sr (
      weekday iso_day_of_week,
      availability int4range
    )
    CROSS JOIN added
)
SELECT id FROM added
