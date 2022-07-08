const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TYPE marketing_palette ADD ATTRIBUTE address stdaddr',
  'UPDATE brand_settings SET marketing_palette.address = brand_settings.address',
  'ALTER TABLE brand_settings DROP address',

  `CREATE OR REPLACE FUNCTION MARKETING_PALETTE_TO_JSON(input marketing_palette)
RETURNS JSON AS $$

  WITH palette AS (
    SELECT JSON_STRIP_NULLS(
      JSON_BUILD_OBJECT(
        'body-bg-color',                 ($1)."body-bg-color",
        'body-text-color',               ($1)."body-text-color",
        'body-font-family',              ($1)."body-font-family",
        'body-font-size',                ($1)."body-font-size",
        'body-font-weight',              ($1)."body-font-weight",
        'body-logo-wide',                ($1)."body-logo-wide",
        'body-logo-square',              ($1)."body-logo-square",

        'container-bg-color',            ($1)."container-bg-color",
        'container-text-color',          ($1)."container-text-color",
        'container-font-family',         ($1)."container-font-family",
        'container-font-size',           ($1)."container-font-size",
        'container-font-weight',         ($1)."container-font-weight",
        'container-logo-wide',           ($1)."container-logo-wide",
        'container-logo-square',         ($1)."container-logo-square",

        'button-bg-color',               ($1)."button-bg-color",
        'button-text-color',             ($1)."button-text-color",
        'button-font-family',            ($1)."button-font-family",
        'button-font-size',              ($1)."button-font-size",
        'button-font-weight',            ($1)."button-font-weight",
        'button-border',                 ($1)."button-border",

        'light-text-color',              ($1)."light-text-color",
        'light-font-family',             ($1)."light-font-family",
        'light-font-size',               ($1)."light-font-size",
        'light-font-weight',             ($1)."light-font-weight",

        'h1-text-color',                 ($1)."h1-text-color",
        'h1-font-family',                ($1)."h1-font-family",
        'h1-font-size',                  ($1)."h1-font-size",
        'h1-font-weight',                ($1)."h1-font-weight",

        'h2-text-color',                 ($1)."h2-text-color",
        'h2-font-family',                ($1)."h2-font-family",
        'h2-font-size',                  ($1)."h2-font-size",
        'h2-font-weight',                ($1)."h2-font-weight",

        'h3-text-color',                 ($1)."h3-text-color",
        'h3-font-family',                ($1)."h3-font-family",
        'h3-font-size',                  ($1)."h3-font-size",
        'h3-font-weight',                ($1)."h3-font-weight",

        'inverted-container-bg-color',   ($1)."inverted-container-bg-color",
        'inverted-container-text-color', ($1)."inverted-container-text-color",
        'inverted-button-bg-color',      ($1)."inverted-button-bg-color",
        'inverted-button-text-color',    ($1)."inverted-button-text-color",
        'inverted-light-text-color',     ($1)."inverted-light-text-color",
        'inverted-h1-text-color',        ($1)."inverted-h1-text-color",
        'inverted-h2-text-color',        ($1)."inverted-h2-text-color",
        'inverted-h3-text-color',        ($1)."inverted-h3-text-color",
        'inverted-logo-wide',            ($1)."inverted-logo-wide",
        'inverted-logo-square',          ($1)."inverted-logo-square",

        'website',                       ($1)."website",
        'name',                          ($1)."name",
        'phone_number',                  ($1)."phone_number",

        'address',                       STDADDR_TO_JSON(($1)."address")
      )
    ) as palette
  )

  SELECT
    CASE
      WHEN (SELECT NULLIF(palette::jsonb, '{}'::jsonb) FROM palette) IS NULL THEN NULL

      ELSE (
        SELECT
          (palette::jsonb || '{"type":"marketing_palette"}'::jsonb)::json
        FROM palette
      )
    END
$$
LANGUAGE SQL;`,

  `CREATE OR REPLACE FUNCTION JSON_TO_MARKETING_PALETTE(input JSONB)
RETURNS marketing_palette AS $$
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
      $1->>'h3-font-weight',

      $1->>'inverted-button-bg-color',
      $1->>'inverted-button-text-color',
      $1->>'inverted-light-text-color',
      $1->>'inverted-h1-text-color',
      $1->>'inverted-h2-text-color',
      $1->>'inverted-h3-text-color',
      $1->>'inverted-logo-wide',
      $1->>'inverted-logo-square',
      $1->>'inverted-container-bg-color',
      $1->>'inverted-container-text-color',

      $1->>'website',
      $1->>'name',
      $1->>'phone_number',

      JSON_TO_STDADDR(($1->>'address')::jsonb)
    )::marketing_palette
$$
LANGUAGE SQL`,

  'COMMIT'
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
