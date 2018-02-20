const request = require('request-promise-native')
const db = require('../../utils/db')

BrokerWolf.Classifications = {}

BrokerWolf.Classifications.sync = async () => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/classifications/v1/',
  }

  const req = BrokerWolf.tokenize(options)

  const res = JSON.parse(await request(req))

  for(const classification of res){
    await db.query.promise('brokerwolf/classifications/insert', [
      classification.Id,
      classification
    ])
  }

  return res
}

BrokerWolf.Classifications.map = async ({brokerwolf_id, ender_type}) => {
  await db.query.promise('brokerwolf/classifications/map', [
    brokerwolf_id,
    ender_type
  ])
}

BrokerWolf.Classifications.getId = async ender_type => {
  const res = await db.query.promise('brokerwolf/classifications/get-id', [ender_type])

  if (res.rows.length < 1)
    throw new Error.ResourceNotFound(`Could not find BrokerWolf mapping for ${ender_type} ender type`)

  return res.rows[0].brokerwolf_id
}
