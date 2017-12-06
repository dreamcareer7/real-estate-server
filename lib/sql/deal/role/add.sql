INSERT INTO deals_roles(
  created_by,
  role,
  deal,
  "user",
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
  $9
)
ON CONFLICT (deal, role, "user") DO UPDATE
 SET deleted_at = NULL /* Undelete the role if its added again. See isse Applause#468 */
WHERE deals_roles.deal = $3 AND deals_roles.role = $2 AND deals_roles.user = $4