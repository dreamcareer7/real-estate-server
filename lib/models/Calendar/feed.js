const Context = require('../Context')
const Orm     = require('../Orm')
const User    = require('../User')

const Calendar     = require('./index')
const FeedSettings = require('./feed_settings')

const associations = [
  'calendar_event.full_crm_task',
  'crm_task.associations',
  'crm_task.assignees',
  'crm_task.reminders',
  'crm_association.contact'
]


/**
 * @typedef ISettingsFilter
 * @prop {number=} low
 * @prop {number=} high
 * @prop {number=} last_updated_gt
 *
 * @param {UUID} brand 
 * @param {UUID} user
 * @param {ISettingsFilter} query 
 */
async function filter(brand, user, query) {
  const settings = await FeedSettings.get(user)
  if (!settings) return []
  if (Array.isArray(settings.selected_types) && settings.selected_types.length === 0) {
    settings.selected_types = null
  }

  const setting_filter_applies_to_brand = settings.filter
    ? settings.filter.findIndex(f => f.brand === brand && (!f.users || f.users.includes(user))) > -1
    : false

  if (settings.filter && !setting_filter_applies_to_brand) return []

  return Calendar.filter([{ brand, users: [user] }], {
    ...query,
    event_types: settings.selected_types,
    object_types: ['contact_attribute', 'crm_task', 'deal_context']
  })
}

async function getEvents(credential, query) {
  const user = await User.get(credential.user)

  Context.set({user})
  Orm.setEnabledAssociations(associations)

  const models    = await filter(credential.brand, credential.user, query)
  const calEvents = await Orm.populate({ models, associations })

  return {
    user,
    calEvents
  }
}


module.exports = {
  filter,
  getEvents
}
