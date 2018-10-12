insert into calendar_feed_settings
  ("user", selected_types, filter)
values (
  $1,
  $2,
  $3
)
on conflict ("user") do
update
set selected_types = $2,
    filter = $3::jsonb[],
    updated_at = now()
returning "user"
