CREATE OR REPLACE FUNCTION JSON_TO_THEME(input JSONB)
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

      $1->'navbar'->'background'->>'color',
      $1->'navbar'->'background'->>'contrastText',

      $1->'navbar'->'logo'->>'url',

      $1->'navbar'->'button'->>'main',
      $1->'navbar'->'button'->>'light',
      $1->'navbar'->'button'->>'dark',
      $1->'navbar'->'button'->>'contrastText'
    )::theme
$$
LANGUAGE SQL
