INSERT INTO lead_channels
    ("user", brand, source_type)
VALUES
    ($1, $2, $3)
RETURNING id
