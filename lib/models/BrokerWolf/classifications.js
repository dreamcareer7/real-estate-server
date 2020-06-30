const request = require('request-promise-native')
const tokenize = require('./tokenize')

const db = require('../../utils/db')

const sync = async brand => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/classifications/v1/',
    brand
  }

  const req = await tokenize(options)

  const res = JSON.parse(await request(req))

  for(const classification of res){
    await db.query.promise('brokerwolf/classifications/insert', [
      classification.Id,
      classification
    ])
  }

  return res
}

const map = async ({brokerwolf_id, ender_type}) => {
  await db.query.promise('brokerwolf/classifications/map', [
    brokerwolf_id,
    ender_type
  ])
}

const getId = async ender_type => {
  const res = await db.query.promise('brokerwolf/classifications/get-id', [ender_type])

  if (res.rows.length < 1)
    throw new Error.ResourceNotFound(`Could not find BrokerWolf mapping for ${ender_type} ender type`)

  return res.rows[0].brokerwolf_id
}

module.exports = {
  sync,
  map,
  getId
}
