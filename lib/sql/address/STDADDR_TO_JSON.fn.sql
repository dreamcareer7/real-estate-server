CREATE OR REPLACE FUNCTION STDADDR_TO_JSON(input stdaddr)
RETURNS JSON AS $$
  WITH street_type AS (
    SELECT abbrev FROM tiger.street_type_lookup
    WHERE name = ($1).suftype
  )
  SELECT JSON_STRIP_NULLS(
    JSON_BUILD_OBJECT(
      'building',   INITCAP(NULLIF(($1).building, '')),
      'house_num',  INITCAP(NULLIF(($1).house_num, '')),
      'predir',     INITCAP(NULLIF(($1).predir, '')),
      'qual',       INITCAP(NULLIF(($1).qual, '')),
      'pretype',    INITCAP(NULLIF(($1).pretype, '')),
      'name',       INITCAP(NULLIF(($1).name, '')),
      'suftype',    INITCAP(NULLIF(($1).suftype, '')),
      'sufdir',     INITCAP(NULLIF(($1).sufdir, '')),
      'ruralroute', INITCAP(NULLIF(($1).ruralroute, '')),
      'extra',      INITCAP(NULLIF(($1).extra, '')),
      'city',       INITCAP(NULLIF(($1).city, '')),
      'state',      INITCAP(NULLIF(($1).state, '')),
      'country',    NULLIF(($1).country, ''), -- USA -> Usa ?
      'postcode',   INITCAP(NULLIF(($1).postcode, '')),
      'box',        INITCAP(NULLIF(($1).box, '')),
      'unit',       INITCAP(NULLIF(REPLACE(($1).unit, '# ', '#'), '')),

      'line1', (
        SELECT ARRAY_TO_STRING
          (
            ARRAY[
              INITCAP(NULLIF(($1).building, '')),
              INITCAP(NULLIF(($1).house_num, '')),
              INITCAP(NULLIF(($1).predir, '')),
              INITCAP(NULLIF(($1).qual, '')),
              INITCAP(NULLIF(($1).pretype, '')),
              INITCAP(NULLIF(($1).name, '')),
              (SELECT abbrev FROM street_type),
              INITCAP(NULLIF(($1).sufdir, '')),
              INITCAP(NULLIF(($1).ruralroute, '')),
              CASE
                WHEN ($1).unit IS NULL THEN NULL
                WHEN ($1).unit = '' THEN NULL
                ELSE INITCAP(REPLACE(($1).unit, '# ', '#'))
              END,
              CASE
                WHEN ($1).box IS NULL THEN NULL
                WHEN ($1).box = '' THEN NULL
                ELSE INITCAP(($1).box)
              END
            ], ' ', NULL
          )
      ),

      'line2', (
        SELECT ARRAY_TO_STRING
          (
            ARRAY[
              INITCAP(NULLIF(($1).city, '')),
              INITCAP(NULLIF(($1).state, '')),
              INITCAP(NULLIF(($1).postcode, ''))
            ], ' ', NULL
          )
      ),

      'full', (
        SELECT ARRAY_TO_STRING
          (
            ARRAY[
              INITCAP(NULLIF(($1).building, '')),
              INITCAP(NULLIF(($1).house_num, '')),
              INITCAP(NULLIF(($1).predir, '')),
              INITCAP(NULLIF(($1).qual, '')),
              INITCAP(NULLIF(($1).pretype, '')),
              INITCAP(NULLIF(($1).name, '')),
              (SELECT abbrev FROM street_type),
              INITCAP(NULLIF(($1).sufdir, '')),
              INITCAP(NULLIF(($1).ruralroute, '')),
              CASE
                WHEN ($1).unit IS NULL THEN NULL
                WHEN ($1).unit = '' THEN NULL
                ELSE (REPLACE(INITCAP(($1).unit), '# ', '#')) || ','
              END,
              CASE
                WHEN ($1).box IS NULL THEN NULL
                WHEN ($1).box = '' THEN NULL
                ELSE INITCAP(($1).box)
              END,
              INITCAP(NULLIF(($1).city, '')),
              INITCAP(NULLIF(($1).state, '')),
              INITCAP(NULLIF(($1).postcode, ''))
            ], ' ', NULL
          )
      )
    )
  )
$$
LANGUAGE SQL;
