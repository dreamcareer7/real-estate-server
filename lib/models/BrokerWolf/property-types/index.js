const db = require('../../../utils/db')
const request = require('request-promise-native')
const tokenize = require('../tokenize')

const getId = async property_type => {
  const res = await db.query.promise('brokerwolf/property-types/get-id', [property_type])

  if (res.rows.length < 1)
    throw new Error.ResourceNotFound(`Could not find BrokerWolf mapping for ${property_type} property type`)

  return res.rows[0].brokerwolf_id
}

const map = async ({brokerwolf_id, property_type}) => {
  await db.query.promise('brokerwolf/property-types/map', [
    brokerwolf_id,
    property_type
  ])
}

const sync = async brand => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/property-types/v1/',
    brand
  }

  const req = await tokenize(options)

  const res = JSON.parse(await request(req))

  for(const type of res)
    await db.query.promise('brokerwolf/property-types/insert', [
      type.Id,
      type
    ])

  return res
}

module.exports = {
  sync,
  map,
  getId
}
