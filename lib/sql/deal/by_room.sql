SELECT
  deals.id as deal
FROM tasks
JOIN deals_checklists ON tasks.checklist = deals_checklists.id
JOIN deals ON deals_checklists.deal = deals.id
WHERE tasks.room = $1