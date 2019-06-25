CREATE OR REPLACE FUNCTION STDADDR_TO_JSON(input stdaddr)
RETURNS JSON AS $$
  SELECT JSON_STRIP_NULLS(
    JSON_BUILD_OBJECT(
      'building',   INITCAP(($1).building),
      'house_num',  INITCAP(($1).house_num),
      'predir',     INITCAP(($1).predir),
      'qual',       INITCAP(($1).qual),
      'pretype',    INITCAP(($1).pretype),
      'name',       INITCAP(($1).name),
      'suftype',    INITCAP(($1).suftype),
      'sufdir',     INITCAP(($1).sufdir),
      'ruralroute', INITCAP(($1).ruralroute),
      'extra',      INITCAP(($1).extra),
      'city',       INITCAP(($1).city),
      'state',      UPPER(($1).state),
      'country',    ($1).country, -- USA -> Usa ?
      'postcode',   INITCAP(($1).postcode),
      'box',        INITCAP(($1).box),
      'unit',       (REPLACE(($1).unit, '# ', '#')),

      'line1', (
        SELECT ARRAY_TO_STRING
          (
            ARRAY[
              INITCAP(($1).building),
              INITCAP(($1).house_num),
              INITCAP(($1).predir),
              INITCAP(($1).qual),
              INITCAP(($1).pretype),
              INITCAP(($1).name),
              INITCAP(($1).suftype),
              INITCAP(($1).sufdir),
              INITCAP(($1).ruralroute),
              INITCAP(($1).extra),
              CASE
                WHEN ($1).unit IS NULL THEN NULL
                WHEN ($1).unit = '' THEN NULL
                ELSE 'Unit ' || (REPLACE(($1).unit, '# ', '#')) || ','
              END,
              CASE
                WHEN ($1).box IS NULL THEN NULL
                WHEN ($1).box = '' THEN NULL
                ELSE 'Box ' || INITCAP(($1).box)
              END
            ], ' ', NULL
          )
      ),

      'line2', (
        SELECT ARRAY_TO_STRING
          (
            ARRAY[
              INITCAP(($1).city),
              UPPER(($1).state),
              INITCAP(($1).postcode)
            ], ' ', NULL
          )
      ),

      'full', (
        SELECT ARRAY_TO_STRING
          (
            ARRAY[
              INITCAP(($1).building),
              INITCAP(($1).house_num),
              INITCAP(($1).predir),
              INITCAP(($1).qual),
              INITCAP(($1).pretype),
              INITCAP(($1).name),
              INITCAP(($1).suftype),
              INITCAP(($1).sufdir),
              INITCAP(($1).ruralroute),
              INITCAP(($1).extra),
              CASE
                WHEN ($1).unit IS NULL THEN NULL
                WHEN ($1).unit = '' THEN NULL
                ELSE 'Unit ' || (REPLACE(($1).unit, '# ', '#')) || ','
              END,
              CASE
                WHEN ($1).box IS NULL THEN NULL
                WHEN ($1).box = '' THEN NULL
                ELSE 'Box ' || INITCAP(($1).box)
              END,
              INITCAP(($1).city),
              UPPER(($1).state),
              INITCAP(($1).postcode)
            ], ' ', NULL
          )
      )
    )
  )
$$
LANGUAGE SQL;
