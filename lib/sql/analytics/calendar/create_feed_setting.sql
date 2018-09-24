insert into calendar_feed_settings
  ("user", selected_brand, selected_types, selected_users)
values (
  $1,
  $2,
  $3,
  $4
)
on conflict ("user") do
update
set selected_brand = $2,
    selected_types = $3,
    selected_users = $4::uuid[],
    updated_at = now()
returning "user"
