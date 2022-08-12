CREATE OR REPLACE FUNCTION JSON_TO_STDADDR(input JSONB)
RETURNS stdaddr AS $$
  SELECT
    ROW(
      $1->>'building',
      $1->>'house_num',
      $1->>'predir',
      $1->>'equal',
      $1->>'pretype',
      $1->>'name',
      $1->>'suftype',
      $1->>'sufdir',
      $1->>'ruralroute',
      $1->>'extra',
      $1->>'city',
      $1->>'state',
      $1->>'country',
      $1->>'postcode',
      $1->>'box',
      $1->>'unit',
      $1->>'line1',
      $1->>'line2'
    )::stdaddr
$$
LANGUAGE SQL
