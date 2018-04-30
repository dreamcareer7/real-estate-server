CREATE OR REPLACE VIEW deals_with_rejected_submissions AS
  WITH latest_reviews AS (
    SELECT DISTINCT ON (review) review, status FROM reviews_history ORDER BY review, created_at
  ),
  checklists_with_rejection AS (
    SELECT
      DISTINCT deals_checklists.deal as id
    FROM
      deals_checklists
      INNER JOIN tasks ON tasks.checklist = deals_checklists.id
      INNER JOIN latest_reviews USING (review)
    WHERE
      latest_reviews.status = 'Declined'
      AND deals_checklists.deleted_at IS NULL
      AND deals_checklists.deactivated_at IS NULL
      AND deals_checklists.terminated_at IS NULL
      AND tasks.deleted_at IS NULL
  )
  SELECT
    id,
    brand
  FROM
    checklists_with_rejection
    INNER JOIN deals USING (id)
  WHERE
    deals.deleted_at IS NULL;