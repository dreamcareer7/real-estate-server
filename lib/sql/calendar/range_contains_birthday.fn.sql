CREATE OR REPLACE FUNCTION range_contains_birthday(low timestamptz, high timestamptz, d timestamptz)
RETURNS boolean
IMMUTABLE
LANGUAGE plpgsql
AS $$
  DECLARE
    yh double precision;
    yl double precision;
    yd double precision;
  BEGIN
    yl := date_part('year', low);
    yd := date_part('year', d);
    yh := date_part('year', high);

    RETURN (
      (
        (d + ((yl - yd) || ' years')::interval) BETWEEN low AND high
      )
      OR
      (
        (d + ((yh - yd) || ' years')::interval) BETWEEN low AND high
      )
    );
  END;
$$