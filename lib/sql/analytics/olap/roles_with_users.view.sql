CREATE OR REPLACE VIEW analytics.roles AS
  SELECT
    roles.id,
    array_to_string(
      ARRAY[legal_first_name, legal_middle_name, legal_last_name],
      ' '
    ) AS name,
    role,
    users.id AS "user",
    COALESCE(commission_dollar, commission_percentage * sales_price) AS commission_dollar,
    commission_percentage,
    deal,
    deal_type,
    property_type,
    COALESCE(
      sales_price,
      (SELECT close_price FROM listings WHERE id = deals.listing LIMIT 1)
    ) AS sales_price,
    closing_date,
    closing_date_year,
    closing_date_quarter,
    closing_date_month,
    closing_date_week,
    closing_date_day
  FROM
    deals_roles AS roles
    LEFT JOIN users
      ON ((roles."user" = users.id) OR (roles.email = users.email) OR (roles.phone_number = users.phone_number))
    JOIN analytics.deals AS deals
      ON deals.id = roles.deal
  WHERE
    roles.deleted_at IS NULL
    AND deals.property_type <> ALL(VALUES ('Residential Lease'::deal_property_type), ('Commercial Lease'::deal_property_type))