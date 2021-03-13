CREATE OR REPLACE FUNCTION JSON_TO_UI_PALETTE(input JSONB)
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
LANGUAGE SQL
