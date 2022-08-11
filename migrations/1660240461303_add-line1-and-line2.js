const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE stdaddr ADD ATTRIBUTE line1 TEXT',
  'ALTER TYPE stdaddr ADD ATTRIBUTE line2 TEXT',
  `CREATE OR REPLACE FUNCTION JSON_TO_STDADDR(input JSONB)
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
LANGUAGE SQL`,
  `CREATE OR REPLACE FUNCTION STDADDR_TO_JSON(input stdaddr)
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
                        ELSE (REPLACE(INITCAP(($1).unit), '# ', '#')) || ','
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
LANGUAGE SQL;`
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
