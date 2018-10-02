select
  selected_types,
  filter
from calendar_feed_settings
where "user" = $1
