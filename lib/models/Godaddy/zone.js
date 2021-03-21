const request = require('request-promise-native')
const config = require('../../config')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const { peanar } = require('../../utils/peanar')

const godaddy = require('./client')

const _updateNameservers = async options => {
  const { domain, name_servers, shopper_id } = options

  await promisify(godaddy.domains.update)({
    domain,
    name_servers,
    shopper_id
  })
}

const updateNameservers = peanar.job({
  handler: _updateNameservers,
  queue: 'update_nameservers',
  error_exchange: 'update_nameservers.error',
  exchange: 'update_nameservers',
  name: 'updateNameservers'
})

const createRecord = async (zone_id, record) => {
  await request({
    uri: `${config.cloudflare.base_url}/client/v4/zones/${zone_id}/dns_records`,
    method: 'POST',
    json: true,
    headers: {
      'X-AUTH-EMAIL': config.cloudflare.email,
      'X-AUTH-KEY': config.cloudflare.api_key
    },
    body: record
  })
}

const _createZone = async options => {
  const { result } = await request({
    uri: `${config.cloudflare.base_url}/client/v4/zones`,
    method: 'POST',
    json: true,
    headers: {
      'X-AUTH-EMAIL': config.cloudflare.email,
      'X-AUTH-KEY': config.cloudflare.api_key
    },
    body: {
      account: {
        id: config.cloudflare.account_id,
      },
      name: options.domain
    }
  })

  await db.query.promise('godaddy/domain/set-zone', [
    options.id,
    result.id
  ])

  for(const record of config.cloudflare.records)
    createRecord(result.id, record)

  return await updateNameservers({
    ...options,
    name_servers: result.name_servers
  })
}

const createZone = peanar.job({
  handler: _createZone,
  queue: 'create_zone',
  error_exchange: 'create_zone.error',
  exchange: 'create_zone',
  name: 'createZone'
})

module.exports = {
  createZone
}
