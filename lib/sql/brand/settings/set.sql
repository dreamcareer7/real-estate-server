UPDATE brand_settings SET
  enable_open_house_requests                   = $2,
  enable_yard_sign_requests                    = $3,
  enable_liveby                                = $4,
  disable_sensitive_integrations_for_nonagents = $5,
  marketing_palette                            = JSON_TO_MARKETING_PALETTE($6),
  theme                                        = JSON_TO_THEME($7)
WHERE brand = $1
