WITH added AS (
  INSERT INTO showings (
    /*  $3 */ created_by,
    /*  $3 */ updated_by,
    /*  $4 */ brand,
    /*  $5 */ start_date,
    /*  $6 */ end_date,
    /*  $7 */ duration,
    /*  $8 */ notice_period,
    /*  $9 */ approval_type,
    /* $10 */ feedback_template,
    /* $11 */ deal,
    /* $12 */ listing,
    /* $13 */ address,
    /* $14 */ gallery
  ) VALUES (
    $3::uuid,
    $3::uuid,
    $4::uuid,
    $5::timestamptz,
    $6::timestamptz,
    $7::int * '1 second'::interval,
    $8::int * '1 second'::interval,
    $9::showing_approval_type,
    $10::uuid,
    $11::uuid,
    $12::uuid,
    JSON_TO_STDADDR($13::jsonb),
    $14::uuid
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
