const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION STDADDR_TO_JSON(input stdaddr)
RETURNS JSON AS $$
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
      'state',      UPPER(NULLIF(($1).state, '')),
      'country',    NULLIF(($1).country, ''), -- USA -> Usa ?
      'postcode',   INITCAP(NULLIF(($1).postcode, '')),
      'box',        INITCAP(NULLIF(($1).box, '')),
      'unit',       (NULLIF(REPLACE(($1).unit, '# ', '#'), '')),

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
              INITCAP(NULLIF(($1).suftype, '')),
              INITCAP(NULLIF(($1).sufdir, '')),
              INITCAP(NULLIF(($1).ruralroute, '')),
              INITCAP(NULLIF(($1).extra, '')),
              CASE
                WHEN ($1).unit IS NULL THEN NULL
                WHEN ($1).unit = '' THEN NULL
                ELSE 'Unit ' || (REPLACE(($1).unit, '# ', '#'))
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
              INITCAP(NULLIF(($1).city, '')),
              UPPER(NULLIF(($1).state, '')),
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
              INITCAP(NULLIF(($1).suftype, '')),
              INITCAP(NULLIF(($1).sufdir, '')),
              INITCAP(NULLIF(($1).ruralroute, '')),
              INITCAP(NULLIF(($1).extra, '')),
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
              INITCAP(NULLIF(($1).city, '')),
              UPPER(NULLIF(($1).state, '')),
              INITCAP(NULLIF(($1).postcode, ''))
            ], ' ', NULL
          )
      )
    )
  )
$$
LANGUAGE SQL`,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
