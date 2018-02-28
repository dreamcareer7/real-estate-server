const db = require('../../../utils/db')
const request = require('request-promise-native')

BrokerWolf.PropertyTypes = {}

BrokerWolf.PropertyTypes.getId = async property_type => {
  const res = await db.query.promise('brokerwolf/property-types/get-id', [property_type])

  if (res.rows.length < 1)
    throw new Error.ResourceNotFound(`Could not find BrokerWolf mapping for ${property_type} property type`)

  return res.rows[0].brokerwolf_id
}

BrokerWolf.PropertyTypes.map = async ({brokerwolf_id, property_types}) => {
  await db.query.promise('brokerwolf/property-types/map', [
    brokerwolf_id,
    property_types
  ])
}

BrokerWolf.PropertyTypes.sync = async () => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/property-types/v1/',
  }

  const req = BrokerWolf.tokenize(options)

  const res = JSON.parse(await request(req))

  for(const type of res)
    await db.query.promise('brokerwolf/property-types/insert', [
      type.Id,
      type
    ])

  return res
}