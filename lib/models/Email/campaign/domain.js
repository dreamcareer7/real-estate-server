const config = require('../../../config')
const db     = require('../../../utils/db')

const getDomainForUser = async (user) => {
  if (!user.email_confirmed)
    return config.mailgun.domain

  const domain = user.email.substr(user.email.indexOf('@') + 1)?.toLowerCase()

  if (!domain)
    return config.mailgun.domain

  const found = await db.selectOne('email/campaign/find-domain', [
    domain
  ])

  if (!found)
    return config.mailgun.domain

  return found.mailgun_domain
}

module.exports = { getDomainForUser }
