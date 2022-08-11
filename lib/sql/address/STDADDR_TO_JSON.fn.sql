CREATE OR REPLACE FUNCTION STDADDR_TO_JSON(input stdaddr)
RETURNS JSON AS $$
  WITH street_type AS (
    SELECT NULLIF(COALESCE(abbrev, ($1).suftype), '') as abbrev FROM tiger.street_type_lookup
    WHERE LOWER(name) = LOWER(($1).suftype)
  ),

  stdaddr AS (
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
        'state',      NULLIF((CASE WHEN LENGTH(TRIM(($1).state)) = 2 THEN UPPER(($1).state) ELSE INITCAP(($1).state) END), ''),
        'country',    NULLIF(($1).country, ''), -- USA -> Usa ?
        'postcode',   INITCAP(NULLIF(($1).postcode, '')),
        'box',        INITCAP(NULLIF(($1).box, '')),
        'unit',       INITCAP(NULLIF(REPLACE(($1).unit, '# ', '#'), '')),

        'line1', NULLIF(
          COALESCE(
            NULLIF(($1).line1, ''),
            (SELECT ARRAY_TO_STRING (
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
          )), ''),

        'line2', NULLIF(
          COALESCE(
            NULLIF(($1).line2, ''),
            (SELECT ARRAY_TO_STRING (
              ARRAY[
                INITCAP(NULLIF(($1).city, '')),
                NULLIF((CASE WHEN LENGTH(TRIM(($1).state)) = 2 THEN UPPER(($1).state) ELSE INITCAP(($1).state) END), ''),
                INITCAP(NULLIF(($1).postcode, ''))
              ], ' ', NULL
            ))), ''
        ),

        'full', NULLIF(
          ARRAY_TO_STRING(
            ARRAY[
              COALESCE(
                NULLIF(($1).line1, ''),
                ARRAY_TO_STRING(
                    ARRAY[
                      NULLIF(($1).building, ''),
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
                        ELSE (REPLACE(INITCAP(($1).unit), '# ', '#'))
                      END,
                      CASE
                        WHEN ($1).box IS NULL THEN NULL
                        WHEN ($1).box = '' THEN NULL
                        ELSE INITCAP(($1).box)
                      END
                    ], ' ', NULL
                )
              ),
              COALESCE(
                NULLIF(($1).line2, ''),
                (
                  SELECT ARRAY_TO_STRING(
                    ARRAY[
                      INITCAP(NULLIF(($1).city, '')),
                      NULLIF((CASE WHEN LENGTH(TRIM(($1).state)) = 2 THEN UPPER(($1).state) ELSE INITCAP(($1).state) END), ''),
                      INITCAP(NULLIF(($1).postcode, ''))
                    ], ' ', NULL
                  )
                )
            )
          ], ', ', NULL
        ), ', ')
      )
    ) as address
  )

  SELECT
    CASE
      WHEN (SELECT NULLIF(address::jsonb, '{}'::jsonb) FROM stdaddr) IS NULL THEN NULL

      ELSE (
        SELECT
          (address::jsonb || '{"type":"stdaddr"}'::jsonb)::json
        FROM stdaddr
      )
    END
$$
LANGUAGE SQL;
