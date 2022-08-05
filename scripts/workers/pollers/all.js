function start() {
  for (const { start } of [
    require('./brand_template_thumbnails'),
    require('./calendar_notifications'),
    require('./crm_task_notifications'),
    require('./dailies'),
    require('./deal_notifications'),
    require('./email_campaigns'),
    require('./super_campaigns'),
    require('./email_campaign_stats'),
    require('./email_events_notifications'),
    require('./google'),
    require('./microsoft'),
    require('./notifications'),
    require('./triggers'),
    require('./showing'),
    require('./openhouse_notifications'),
    require('./social_posts')
  ]) {
    start()
  }
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
