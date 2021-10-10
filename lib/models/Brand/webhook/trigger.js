const crypto = require('crypto')
const request = require('request-promise-native')
const { peanar } = require('../../../utils/peanar')

const { find } = require('./get')

const handler = async ({webhook, payload, event, timestamp}) => {
  const key = crypto.createSecretKey(webhook.key, 'hex')

  const body = {
    event,
    timestamp,
    payload
  }

  const hmac = crypto.createHmac('sha256', key)
  hmac.update(JSON.stringify(body))
  const signature = hmac.digest('hex')

  return request({
    url: webhook.url,
    method: 'POST',
    json: true,
    body,
    headers: {
      'X-RECHAT-SIGNATURE': signature
    }
  })
}

const enqueue = peanar.job({
  handler,
  name: 'brand_webhook',
  queue: 'brand_webhook',
  exchange: 'brand_webhook',
  max_retries: 20,
  retry_exchange: 'brand_webhook.retry',
  error_exchange: 'brand_webhook.error'
}) 

const trigger = async ({brand, topic, payload, event}) => {
  const webhooks = await find(brand, topic)

  const timestamp = Date.now()

  const promises = webhooks.map(webhook => {
    return enqueue({webhook, payload, topic, timestamp})
  })

  return Promise.all(promises)
}

module.exports = { 
  trigger
}