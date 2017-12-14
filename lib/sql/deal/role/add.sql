INSERT INTO deals_roles(
  created_by,
  role,
  deal,
  "user",
  company_title,
  legal_prefix,
  legal_first_name,
  legal_middle_name,
  legal_last_name,
  commission_dollar,
  commission_percentage
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9,
  $10,
  $11
)
ON CONFLICT (deal, role, "user") DO UPDATE SET
 deleted_at = NULL, /* Undelete the role if its added again. See isse Applause#468 */
 company_title = $5,
 legal_prefix = $6,
 legal_first_name = $7,
 legal_middle_name = $8,
 legal_last_name = $9,
 commission_dollar = $10,
 commission_percentage = $11
WHERE deals_roles.deal = $3 AND deals_roles.role = $2 AND deals_roles.user = $4