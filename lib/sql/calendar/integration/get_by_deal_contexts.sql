SELECT id FROM calendar_integration WHERE deal_context = ANY($1::uuid[]) AND contact IS NULL