const _ = require('lodash')
const { peanar } = require('../../../utils/peanar')
const Webhooks = {
  ...require('../../Brand/webhook/trigger'),
  ...require('../../Brand/webhook/get'),
}
const Contact = {
  ...require('../get'),
  ...require('../access'),
}
const Orm = require('../../Orm/index')

/**
 * @param {UUID[]} contact_ids
 * @param {'create' | 'update' | 'delete'} event
 * @param {*} metadata
 */
async function callWebhooks(contact_ids, event, metadata) {
  const brands = await Contact.authorizedBrands(contact_ids)
  const webhooks = await Webhooks.find(brands, 'Contacts')
  if (webhooks.length === 0) return

  for (const ids of _.chunk(contact_ids, 50)) {
    const models = await Contact.getAll(ids)
    const payload = await Orm.populate({
      models,
      format: 'references',
      associations: ['contact.attributes', 'contact_attribute.attribute_def'],
    })

    for (const { brand } of webhooks) {
      await Webhooks.trigger({
        brand,
        payload: { ...payload, metadata },
        event,
        topic: 'contacts',
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
