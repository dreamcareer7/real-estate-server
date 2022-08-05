CREATE OR REPLACE FUNCTION JSON_TO_MARKETING_PALETTE(input JSONB)
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
LANGUAGE SQL
