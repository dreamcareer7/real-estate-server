CREATE OR REPLACE FUNCTION update_deal_checklist_property_types()
RETURNS trigger AS
$$
  BEGIN
    WITH e AS (
			SELECT 
				d.id deal, 
				dc.id checklist, 
				fc.id fixed_checklist
			FROM deals d 
			JOIN brands_property_types dp ON d.property_type = dp.id 
			JOIN deals_checklists dc ON d.id = dc.deal
			JOIN brands_checklists bc ON dc.origin = bc.id
			JOIN brands_property_types bp ON bc.property_type = bp.id
			JOIN brands_property_types fp ON fp.label = dp.label 
				 AND fp.brand IN(SELECT * FROM brand_parents(d.brand)) 
			JOIN brands_checklists fc ON fc.property_type = fp.id 
				AND fc.checklist_type = bc.checklist_type 
				AND fc.deleted_at IS NULL 
				AND fc.brand IN(SELECT * FROM brand_parents(d.brand)) 
			JOIN brands fcb ON fc.brand = fcb.id 
			WHERE dp.id <> bp.id
			AND d.id = NEW.id
		)
	UPDATE deals_checklists 
	SET origin = e.fixed_checklist 
	FROM e 
	WHERE deals_checklists.id = e.checklist 
	RETURNING id, origin, deals_checklists.deal;


    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;


DROP TRIGGER IF EXISTS update_deal_checklist_property_types ON deals;

CREATE TRIGGER update_deal_checklist_property_types AFTER UPDATE on deals
FOR EACH ROW
WHEN (OLD.property_type IS DISTINCT FROM NEW.property_type OR OLD.deal_type IS DISTINCT FROM NEW.deal_type)
EXECUTE PROCEDURE update_deal_checklist_property_types();