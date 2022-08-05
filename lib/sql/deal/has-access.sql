SELECT acl::text FROM deals_acl($2::uuid) WHERE deal = $1::uuid
