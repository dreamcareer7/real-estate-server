WITH inserted AS (
  INSERT INTO brands_checklists (
    brand,
    title,
    checklist_type,
    property_type,
    "order",
    is_deactivatable,
    is_terminatable,
    tab_name
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING id
),

contexts AS (
  INSERT INTO brands_contexts_checklists(context, checklist, is_required) 
  SELECT 
    brands_contexts.id, 
    (SELECT id FROM inserted),
    false 
  FROM brands_contexts 
  WHERE brand IN(SELECT * FROM brand_parents($1))
  AND key = ANY(
    CASE
      WHEN $3 = 'Selling' THEN
        ARRAY['photo', 'square_meters', 'mls_area_minor', 'mls_area_major', 'county', 'postal_code', 'state_code', 'state', 'city', 'street_address', 'street_suffix', 'street_name', 'street_dir_prefix', 'street_number', 'subdivision', 'block_number', 'lot_number', 'project_name', 'building_number', 'unit_number', 'full_address', 'latitude', 'longitude', 'mls_number', 'listing_status']

      WHEN $3 = 'Buying' THEN
        ARRAY['photo', 'ender_type', 'title_company', 'mls_area_minor', 'mls_area_major', 'county', 'postal_code', 'state_code', 'state', 'city', 'street_address', 'street_suffix', 'street_name', 'street_dir_prefix', 'street_number', 'subdivision', 'block_number', 'lot_number', 'project_name', 'building_number', 'unit_number', 'full_address', 'latitude', 'longitude', 'mls_number', 'listing_status', 'contract_status']

      WHEN $3 = 'Offer' THEN
        ARRAY['ender_type', 'contract_status']
    END
  )
)

SELECT id FROM inserted
