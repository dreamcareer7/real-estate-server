const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const { get } = require('./get')


const limitAccess = async ({user, deal_id, roles}) => {
  const deal = await promisify(get)(deal_id)

  const res = await db.selectOne('deal/has-access', [
    deal_id,
    user.id,
  ])

  if (!res?.acl)
    throw Error.Forbidden(`Access denied for ${user.display_name} to deal ${deal.title}`)
}

module.exports = { limitAccess }
