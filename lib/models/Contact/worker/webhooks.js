const _ = require('lodash')
const { peanar } = require('../../../utils/peanar')
const Context = require('../../Context')
const Webhooks = {
  ...require('../../Brand/webhook/trigger'),
  ...require('../../Brand/webhook/get'),
  ...require('../../Brand/webhook/constants'),
}
const Contact = {
  ...require('../get'),
  ...require('../access'),
}
const Orm = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context')
}

/**
 * @param {UUID[]} contact_ids
 * @param {'create' | 'update' | 'delete'} event
 * @param {*} metadata
 */
async function callWebhooks(contact_ids, event, metadata) {
  const brands = await Contact.authorizedBrands(contact_ids)
  const webhooks = await Webhooks.find(brands, Webhooks.Topic.Contacts)
  if (webhooks.length === 0) {
    Context.log('[Contact Webhooks] No webhooks found for brands', brands)
    return
  }

  Orm.enableAssociation('contact.attributes')
  for (const ids of _.chunk(contact_ids, 50)) {
    const models = await Contact.getAll(ids)
    const payload = await Orm.populate({
      models,
      format: 'references',
      associations: ['contact.attributes', 'contact_attribute.attribute_def'],
    })

    for (const { brand } of webhooks) {
      Context.log(`Webhooks triggered for brand "${brand}"`)
      await Webhooks.trigger({
        brand,
        payload: { ...payload, metadata },
        event,
        topic: Webhooks.Topic.Contacts,
        withParents: false
      })
    }
  }
}

module.exports = {
  call_webhooks: peanar.job({
    handler: callWebhooks,
    exchange: 'contacts',
    queue: 'contacts',
    error_exchange: 'contacts.error',
    retry_exchange: 'contacts.retry',
    retry_delay: 20000,
    max_retries: 10,
    name: 'contacts/call_webhooks',
  }),
}
