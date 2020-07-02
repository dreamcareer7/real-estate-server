const db = require('../../utils/db')
const { get } = require('./get')

const limitAccess = async ({user, deal_id, roles}) => {
  const deal = await promisify(get)(deal_id)

  const { has_access } = await db.selectOne('deal/has-access', [
    deal_id,
    user.id,
  ])

  if (!has_access)
    throw Error.Forbidden(`Access denied for ${user.display_name} to deal ${deal.title}`)
}

module.exports = { limitAccess }
