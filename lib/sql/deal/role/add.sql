INSERT INTO deals_roles(
  created_by,
  role,
  deal,
  "user",
  title_company,
  legal_prefix,
  legal_first_name,
  legal_middle_name,
  legal_last_name,
  commission
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
  $10
)
ON CONFLICT (deal, role, "user") DO UPDATE SET
 deleted_at = NULL, /* Undelete the role if its added again. See isse Applause#468 */
 title_company = $5,
 legal_prefix = $6,
 legal_first_name = $7,
 legal_middle_name = $8,
 legal_last_name = $9,
 commission = $10
WHERE deals_roles.deal = $3 AND deals_roles.role = $2 AND deals_roles.user = $4