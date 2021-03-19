CREATE OR REPLACE VIEW analytics.calendar AS (
  (
    SELECT * FROM calendar.activity
  )
  UNION ALL
  (
    SELECT * FROM calendar.contact
  )
  UNION ALL
  (
    SELECT * FROM calendar.contact_attribute
  )
  UNION ALL
  (
    SELECT * FROM calendar.crm_association
  )
  UNION ALL
  (
    SELECT * FROM calendar.crm_task
  )
  UNION ALL
  (
    SELECT * FROM calendar.deal_context
  )
  UNION ALL
  (
    SELECT * FROM calendar.email_campaign_email_executed
  )
  UNION ALL
  (
    SELECT * FROM calendar.email_campaign_executed
  )
  UNION ALL
  (
    SELECT * FROM calendar.email_campaign_scheduled
  )
  UNION ALL
  (
    SELECT * FROM calendar.email_thread
  )
  UNION ALL
  (
    SELECT * FROM calendar.email_thread_recipient
  )
  UNION ALL
  (
    SELECT * FROM calendar.flow
  )
  UNION ALL
  (
    SELECT * FROM calendar.home_anniversary
  )
  UNION ALL
  (
    SELECT * FROM calendar.showing
  )
)
