CREATE OR REPLACE FUNCTION UI_PALETTE_TO_JSON(input ui_palette)
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
          'contrast-text',     ($1)."navbar-contrast-text",
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
