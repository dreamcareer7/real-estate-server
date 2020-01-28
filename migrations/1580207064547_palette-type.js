const db = require('../lib/utils/db')



const migrations = [
  'BEGIN',
  `CREATE TYPE palette AS (
    "body-bg-color"         TEXT,
    "body-text-color"       TEXT,
    "body-font-family"      TEXT,
    "body-font-size"        TEXT,
    "body-font-weight"      TEXT,
    "body-logo-wide"        TEXT,
    "body-logo-square"      TEXT,

    "container-bg-color"    TEXT,
    "container-text-color"  TEXT,
    "container-font-family" TEXT,
    "container-font-size"   TEXT,
    "container-font-weight" TEXT,
    "container-logo-wide"   TEXT,
    "container-logo-square" TEXT,

    "button-bg-color"       TEXT,
    "button-text-color"     TEXT,
    "button-font-family"    TEXT,
    "button-font-size"      TEXT,
    "button-font-weight"    TEXT,
    "button-border"         TEXT,

    "light-text-color"      TEXT,
    "light-font-family"     TEXT,
    "light-font-size"       TEXT,
    "light-font-weight"     TEXT,

    "h1-text-color"         TEXT,
    "h1-font-family"        TEXT,
    "h1-font-size"          TEXT,
    "h1-font-weight"        TEXT,

    "h2-text-color"         TEXT,
    "h2-font-family"        TEXT,
    "h2-font-size"          TEXT,
    "h2-font-weight"        TEXT,

    "h3-text-color"         TEXT,
    "h3-font-family"        TEXT,
    "h3-font-size"          TEXT,
    "h3-font-weight"        TEXT
  )`,

  'ALTER TABLE brands_settings ADD palette palette',

  'ALTER TABLE brands_settings DROP CONSTRAINT type',

  `CREATE OR REPLACE FUNCTION JSON_TO_PALETTE(input JSONB)
RETURNS palette AS $$
  SELECT
    ROW(
      $1->>'body-bg-color',
      $1->>'body-text-color',
      $1->>'body-font-family',
      $1->>'body-font-size',
      $1->>'body-font-weight',
      $1->>'body-logo-wide',
      $1->>'body-logo-square',

      $1->>'container-bg-color',
      $1->>'container-text-color',
      $1->>'container-font-family',
      $1->>'container-font-size',
      $1->>'container-font-weight',
      $1->>'container-logo-wide',
      $1->>'container-logo-square',

      $1->>'button-bg-color',
      $1->>'button-text-color',
      $1->>'button-font-family',
      $1->>'button-font-size',
      $1->>'button-font-weight',
      $1->>'button-border',

      $1->>'light-text-color',
      $1->>'light-font-family',
      $1->>'light-font-size',
      $1->>'light-font-weight',

      $1->>'h1-text-color',
      $1->>'h1-font-family',
      $1->>'h1-font-size',
      $1->>'h1-font-weight',

      $1->>'h2-text-color',
      $1->>'h2-font-family',
      $1->>'h2-font-size',
      $1->>'h2-font-weight',

      $1->>'h3-text-color',
      $1->>'h3-font-family',
      $1->>'h3-font-size',
      $1->>'h3-font-weight'
    )::palette
$$
LANGUAGE SQL`,

  `CREATE OR REPLACE FUNCTION PALETTE_TO_JSON(input palette)
RETURNS JSON AS $$

  WITH palette AS (
    SELECT JSON_STRIP_NULLS(
      JSON_BUILD_OBJECT(
        'body-bg-color',           ($1)."body-bg-color",
        'body-text-color',         ($1)."body-text-color",
        'body-font-family',        ($1)."body-font-family",
        'body-font-size',          ($1)."body-font-size",
        'body-font-weight',        ($1)."body-font-weight",
        'body-logo-wide',          ($1)."body-logo-wide",
        'body-logo-square',        ($1)."body-logo-square",

        'container-bg-color',      ($1)."container-bg-color",
        'container-text-color',    ($1)."container-text-color",
        'container-font-family',   ($1)."container-font-family",
        'container-font-size',     ($1)."container-font-size",
        'container-font-weight',   ($1)."container-font-weight",
        'container-logo-wide',     ($1)."container-logo-wide",
        'container-logo-square',   ($1)."container-logo-square",

        'button-bg-color',         ($1)."button-bg-color",
        'button-text-color',       ($1)."button-text-color",
        'button-font-family',      ($1)."button-font-family",
        'button-font-size',        ($1)."button-font-size",
        'button-font-weight',      ($1)."button-font-weight",
        'button-border',           ($1)."button-border",

        'light-text-color',        ($1)."light-text-color",
        'light-font-family',       ($1)."light-font-family",
        'light-font-size',         ($1)."light-font-size",
        'light-font-weight',       ($1)."light-font-weight",

        'h1-text-color',           ($1)."h1-text-color",
        'h1-font-family',          ($1)."h1-font-family",
        'h1-font-size',            ($1)."h1-font-size",
        'h1-font-weight',          ($1)."h1-font-weight",

        'h2-text-color',           ($1)."h2-text-color",
        'h2-font-family',          ($1)."h2-font-family",
        'h2-font-size',            ($1)."h2-font-size",
        'h2-font-weight',          ($1)."h2-font-weight",

        'h3-text-color',           ($1)."h3-text-color",
        'h3-font-family',          ($1)."h3-font-family",
        'h3-font-size',            ($1)."h3-font-size",
        'h3-font-weight',          ($1)."h3-font-weight"
      )
    ) as palette
  )

  SELECT
    CASE
      WHEN (SELECT NULLIF(palette::jsonb, '{}'::jsonb) FROM palette) IS NULL THEN NULL

      ELSE (
        SELECT
          (palette::jsonb || '{"type":"palette"}'::jsonb)::json
        FROM palette
      )
    END
$$
LANGUAGE SQL`,

  'COMMIT',

  `ALTER TYPE brand_setting
    ADD VALUE 'palette'`
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
