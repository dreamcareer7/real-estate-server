insert into calendar_feed_settings("user", selected_brand, selected_types)
values (
  $1,
  $2,
  $3
)
on conflict ("user") do
update
set selected_brand = $2,
    selected_types = $3,
    updated_at = transaction_timestamp()
returning "user"
