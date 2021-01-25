SELECT id FROM brands_assets WHERE deleted_at IS NULL AND brand IN(SELECT brand_parents($1))
