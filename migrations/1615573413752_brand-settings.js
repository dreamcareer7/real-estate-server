const db = require('../lib/utils/db')

const json_to_marketing_palette = `CREATE OR REPLACE FUNCTION JSON_TO_MARKETING_PALETTE(input JSONB)
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
      $1->>'name'
    )::marketing_palette
$$
LANGUAGE SQL
`

const json_to_ui_palette = `CREATE OR REPLACE FUNCTION JSON_TO_UI_PALETTE(input JSONB)
RETURNS ui_palette AS $$
  SELECT
    ROW(
      $1->'common'->>'black',
      $1->'common'->>'white',

      $1->'primary'->>'main',
      $1->'primary'->>'light',
      $1->'primary'->>'dark',
      $1->'primary'->>'contrastText',

      $1->'secondary'->>'main',
      $1->'secondary'->>'light',
      $1->'secondary'->>'dark',
      $1->'secondary'->>'contrastText',

      $1->'error'->>'main',
      $1->'error'->>'light',
      $1->'error'->>'dark',
      $1->'error'->>'contrastText',

      $1->'warning'->>'main',
      $1->'warning'->>'light',
      $1->'warning'->>'dark',
      $1->'warning'->>'contrastText',

      $1->'info'->>'main',
      $1->'info'->>'light',
      $1->'info'->>'dark',
      $1->'info'->>'contrastText',

      $1->'success'->>'main',
      $1->'success'->>'light',
      $1->'success'->>'dark',
      $1->'success'->>'contrastText',

      $1->'text'->>'primary',
      $1->'text'->>'secondary',
      $1->'text'->>'disabled',
      $1->'info'->>'hint',

      $1->'divider',

      $1->'background'->>'paper',
      $1->'background'->>'default',
      $1->'background'->>'level2',
      $1->'background'->>'level1',

      $1->'navbar'->>'background',
      $1->'navbar'->>'contrastText',
      $1->'navbar'->>'logo'
    )::ui_palette
$$
LANGUAGE SQL`

const ui_palette_to_json = `CREATE OR REPLACE FUNCTION UI_PALETTE_TO_JSON(input ui_palette)
RETURNS JSON AS $$

  WITH palette AS (
    SELECT JSON_STRIP_NULLS(
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
          'contrast-text',     ($1)."primary-contrast-text"
        )),

        'secondary',
        JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
          'main',             ($1)."secondary-main",
          'light',            ($1)."secondary-light",
          'dark',             ($1)."secondary-dark",
          'contrast-text',     ($1)."secondary-contrast-text"
        )),

        'error',
        JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
          'main',             ($1)."error-main",
          'light',            ($1)."error-light",
          'dark',             ($1)."error-dark",
          'contrast-text',     ($1)."error-contrast-text"
        )),

        'warning',
        JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
          'main',             ($1)."warning-main",
          'light',            ($1)."warning-light",
          'dark',             ($1)."warning-dark",
          'contrast-text',     ($1)."warning-contrast-text"
        )),

        'info',
        JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
          'main',             ($1)."info-main",
          'light',            ($1)."info-light",
          'dark',             ($1)."info-dark",
          'contrast-text',     ($1)."info-contrast-text"
        )),

        'success',
        JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
          'main',             ($1)."success-main",
          'light',            ($1)."success-light",
          'dark',             ($1)."success-dark",
          'contrast-text',     ($1)."success-contrast-text"
        )),

        'text',
        JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
          'main',             ($1)."text-primary",
          'light',            ($1)."text-secondary",
          'dark',             ($1)."text-disabled",
          'contrast-text',     ($1)."text-hint"
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
          'background',       ($1)."navbar-background",
          'contrast-text',    ($1)."navbar-contrast-text",
          'logo',             ($1)."navbar-logo"
        ))
      )
    ) as palette
  )

  SELECT
    CASE
      WHEN (SELECT NULLIF(palette::jsonb, '{}'::jsonb) FROM palette) IS NULL THEN NULL

      ELSE (
        SELECT
          (palette::jsonb || '{"type":"ui_palette"}'::jsonb)::json
        FROM palette
      )
    END
$$
LANGUAGE SQL;
`

const marketing_palette_to_json = `CREATE OR REPLACE FUNCTION MARKETING_PALETTE_TO_JSON(input marketing_palette)
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
        'name',                          ($1)."name"
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
LANGUAGE SQL;`

const migrations = [
  'BEGIN',

  `CREATE TYPE ui_palette AS (
    "common-black" TEXT,
    "common-white" TEXT,

    "primary-main" TEXT,
    "primary-light" TEXT,
    "primary-dark" TEXT,
    "primary-contrast-text" TEXT,

    "secondary-main" TEXT,
    "secondary-light" TEXT,
    "secondary-dark" TEXT,
    "secondary-contrast-text" TEXT,

    "error-light" TEXT,
    "error-main" TEXT,
    "error-dark" TEXT,
    "error-contrast-text" TEXT,

    "warning-light" TEXT,
    "warning-main" TEXT,
    "warning-dark" TEXT,
    "warning-contrast-text" TEXT,

    "info-light" TEXT,
    "info-main" TEXT,
    "info-dark" TEXT,
    "info-contrast-text" TEXT,

    "success-light" TEXT,
    "success-main" TEXT,
    "success-dark" TEXT,
    "success-contrast-text" TEXT,

    "text-primary" TEXT,
    "text-secondary" TEXT,
    "text-disabled" TEXT,
    "text-hint" TEXT,

    "divider" TEXT,

    "background-paper" TEXT,
    "background-default" TEXT,
    "background-level2" TEXT,
    "background-level1" TEXT,

    "navbar-background" TEXT,
    "navbar-contrast-text" TEXT,
    "navbar-logo" TEXT
  )`,

  'ALTER TYPE palette RENAME TO marketing_palette',

  'DROP FUNCTION JSON_TO_PALETTE',
  'DROP FUNCTION PALETTE_TO_JSON',

  json_to_marketing_palette,
  marketing_palette_to_json,

  json_to_ui_palette,
  ui_palette_to_json,

  `CREATE TABLE brand_settings (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at  timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at  timestamp with time zone NOT NULL DEFAULT NOW(),
    brand uuid NOT NULL REFERENCES brands(id),
    enable_open_house_requests boolean,
    enable_yard_sign_requests boolean,
    enable_liveby boolean,
    disable_sensitive_integrations_for_nonagents boolean,
    marketing_palette marketing_palette,
    ui_palette ui_palette
  )`,

  'INSERT INTO brand_settings (id, brand) SELECT id, id FROM brands',

  `UPDATE brand_settings
    SET enable_open_house_requests = old.boolean
    FROM brands_settings old WHERE brand_settings.brand = old.brand
    AND key = 'enable-open-house-requests' AND boolean IS NOT NULL`,

  `UPDATE brand_settings
    SET enable_yard_sign_requests = old.boolean
    FROM brands_settings old WHERE brand_settings.brand = old.brand
    AND key = 'enable-yard-sign-requests' AND boolean IS NOT NULL`,

  `UPDATE brand_settings
    SET enable_liveby = old.boolean
    FROM brands_settings old WHERE brand_settings.brand = old.brand
    AND key = 'enable-liveby' AND boolean IS NOT NULL`,

  `UPDATE brand_settings
    SET marketing_palette = old.palette
    FROM brands_settings old WHERE brand_settings.brand = old.brand
    AND key = 'palette' AND palette IS NOT NULL`,

  'DROP TABLE brands_settings',
  'DROP TYPE brand_setting',

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations)
    await conn.query(sql)

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
