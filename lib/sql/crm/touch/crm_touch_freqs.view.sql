CREATE OR REPLACE VIEW crm_touch_freqs AS (
  SELECT id AS contact, touch_freq from contacts
)
