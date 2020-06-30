const request = require('request-promise-native')
const db = require('../../../utils/db')
const tokenize = require('../tokenize')

const sync = async brand => {
  const options = {
    method: 'GET',
    uri: '/wolfconnect/contact-types/v1/',
    brand
  }

  const req = await tokenize(options)

  const res = JSON.parse(await request(req))

  for(const ctype of res)
    await db.query.promise('brokerwolf/contact-types/insert', [
      ctype.Id,
      ctype
    ])

  return res
}

const map = async ({brokerwolf_id, roles}) => {
  await db.query.promise('brokerwolf/contact-types/map', [
    brokerwolf_id,
    roles
  ])
}

const getId = async role => {
  const res = await db.query.promise('brokerwolf/contact-types/get-id', [role])

  if (res.rows.length < 1)
    throw new Error.ResourceNotFound(`Could not find BrokerWolf mapping for ${role} contact type`)

  return res.rows[0].brokerwolf_id
}

module.exports = {
  sync,
  map,
  getId
}
