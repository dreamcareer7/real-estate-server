const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION JSON_TO_THEME(input JSONB)
RETURNS theme AS $$
  SELECT
    ROW(
      $1->'palette'->'common'->>'black',
      $1->'palette'->'common'->>'white',

      $1->'palette'->'primary'->>'main',
      $1->'palette'->'primary'->>'light',
      $1->'palette'->'primary'->>'dark',
      $1->'palette'->'primary'->>'contrastText',

      $1->'palette'->'secondary'->>'main',
      $1->'palette'->'secondary'->>'light',
      $1->'palette'->'secondary'->>'dark',
      $1->'palette'->'secondary'->>'contrastText',

      $1->'palette'->'error'->>'main',
      $1->'palette'->'error'->>'light',
      $1->'palette'->'error'->>'dark',
      $1->'palette'->'error'->>'contrastText',

      $1->'palette'->'warning'->>'main',
      $1->'palette'->'warning'->>'light',
      $1->'palette'->'warning'->>'dark',
      $1->'palette'->'warning'->>'contrastText',

      $1->'palette'->'info'->>'main',
      $1->'palette'->'info'->>'light',
      $1->'palette'->'info'->>'dark',
      $1->'palette'->'info'->>'contrastText',

      $1->'palette'->'success'->>'main',
      $1->'palette'->'success'->>'light',
      $1->'palette'->'success'->>'dark',
      $1->'palette'->'success'->>'contrastText',

      $1->'palette'->'text'->>'primary',
      $1->'palette'->'text'->>'secondary',
      $1->'palette'->'text'->>'disabled',
      $1->'palette'->'info'->>'hint',

      $1->'palette'->'divider',

      $1->'palette'->'background'->>'paper',
      $1->'palette'->'background'->>'default',
      $1->'palette'->'background'->>'level2',
      $1->'palette'->'background'->>'level1',

      $1->'navbar'->>'background',
      $1->'navbar'->>'contrastText',

      $1->'navbar'->'logo'->>'url',

      $1->'navbar'->'button'->>'main',
      $1->'navbar'->'button'->>'light',
      $1->'navbar'->'button'->>'dark',
      $1->'navbar'->'button'->>'contrastText'
    )::theme
$$
LANGUAGE SQL`,
  `CREATE OR REPLACE FUNCTION THEME_TO_JSON(input theme)
RETURNS JSON AS $$

  WITH theme AS (
    SELECT JSON_STRIP_NULLS(
      JSON_BUILD_OBJECT(
        'navbar_logo',           ($1)."navbar-logo",

        'palette',
        JSON_BUILD_OBJECT(
          'common',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'black',             ($1)."common-black",
            'white',             ($1)."common-white"
          )),

          'primary',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'main',             ($1)."primary-main",
            'light',            ($1)."primary-light",
            'dark',             ($1)."primary-dark",
            'contrastText',    ($1)."primary-contrast-text"
          )),

          'secondary',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'main',             ($1)."secondary-main",
            'light',            ($1)."secondary-light",
            'dark',             ($1)."secondary-dark",
            'contrastText',     ($1)."secondary-contrast-text"
          )),

          'error',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'main',             ($1)."error-main",
            'light',            ($1)."error-light",
            'dark',             ($1)."error-dark",
            'contrastText',     ($1)."error-contrast-text"
          )),

          'warning',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'main',             ($1)."warning-main",
            'light',            ($1)."warning-light",
            'dark',             ($1)."warning-dark",
            'contrastText',     ($1)."warning-contrast-text"
          )),

          'info',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'main',             ($1)."info-main",
            'light',            ($1)."info-light",
            'dark',             ($1)."info-dark",
            'contrastText',     ($1)."info-contrast-text"
          )),

          'success',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'main',             ($1)."success-main",
            'light',            ($1)."success-light",
            'dark',             ($1)."success-dark",
            'contrastText',     ($1)."success-contrast-text"
          )),

          'text',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'main',             ($1)."text-primary",
            'light',            ($1)."text-secondary",
            'dark',             ($1)."text-disabled",
            'contrastText',     ($1)."text-hint"
          )),

          'divider',
          ($1)."divider",

          'background',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'paper',            ($1)."background-paper",
            'default',          ($1)."background-default",
            'level1',           ($1)."background-level1",
            'level2',           ($1)."background-level2"
          )),

          'navbar',
          JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'logo',       JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
                              'url',    ($1)."navbar-logo"
                          )),

            'button',     JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
                              'main',          ($1)."navbar-button-main",
                              'light',         ($1)."navbar-button-light",
                              'dark',          ($1)."navbar-button-dark",
                              'contrastText',  ($1)."navbar-button-contrast-text"
                          )),

            'background',   JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
                              'color',         ($1)."navbar-background",
                              'contrastText',  ($1)."navbar-contrast-text"
                          ))
            )
          )
        )
      )
    ) as theme
  )

  SELECT
    CASE
      WHEN (SELECT NULLIF(theme::jsonb, '{}'::jsonb) FROM theme) IS NULL THEN NULL

      ELSE (
        SELECT
          (theme::jsonb || '{"type":"theme"}'::jsonb)::json
        FROM theme
      )
    END
$$
LANGUAGE SQL;`,
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
