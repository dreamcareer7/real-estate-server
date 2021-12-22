const { peanar } = require('../../../../utils/peanar')
const { updateTriggersHandler } = require('./update-triggers-handler')
const { dateAttributesCreated } = require('./date-attributes-created')
const { dateAttributesDeleted } = require('./date-attributes-deleted')
const { contactsMerged } = require('./contacts-merged')
const { flowTriggerExecuted } = require('./flow-trigger-executed')
const { createTriggersAfterExclusionIsDeleted } = require('./create-triggers-after-exclusion-is-deleted')

module.exports = {
  updateTriggers: peanar.job({
    handler: updateTriggersHandler,
    name: 'brand_trigger/update_triggers',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error',
  }),
  
  dateAttributesCreated: peanar.job({
    handler: dateAttributesCreated,
    name: 'brand_trigger/on_date_attribute_created',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error',
  }),
  
  dateAttributesDeleted: peanar.job({
    handler: dateAttributesDeleted,
    name: 'brand_trigger/on_date_attribute_deleted',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error',
  }),
  
  contactsMerged: peanar.job({
    handler: contactsMerged,
    name: 'brand_trigger/on_contacts_merged',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error',
  }),
  
  flowTriggerExecuted: peanar.job({
    handler: flowTriggerExecuted,
    name: 'brand_trigger/on_trigger_effectively_executed',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error'
  }),
  
  createTriggersAfterExclusionIsDeleted: peanar.job({
    handler: createTriggersAfterExclusionIsDeleted,
    name: 'brand_trigger/create_campaigns_and_triggers',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error'
  }),
}
  