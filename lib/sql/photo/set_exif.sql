UPDATE photos SET exif =
regexp_replace($1::text, '\\u0000', '', 'g')::jsonb
WHERE matrix_unique_id = $2;