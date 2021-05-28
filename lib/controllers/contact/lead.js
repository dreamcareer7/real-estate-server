const b64 = require('base64url').default

const Brand = require('../../models/Brand')
const Context = require('../../models/Context')
const Crypto = require('../../models/Crypto')
const LtsLead = require('../../models/Contact/lead/save')
const User = require('../../models/User/get')

const parseLeadEmail = require('../../models/Contact/lead/email')

async function captureLead(req, res) {
  const decrypted = Crypto.decrypt(b64.decode(req.params.key))

  /** @type {import('../../models/Contact/lead/types').ILtsLeadUrlMetadata} */
  let data
  try {
    data = {
      mls: ['NTREIS'],
      ...JSON.parse(decrypted),
      source: 'Website',
    }
  } catch (err) {
    throw Error.Validation('Data is malformed')
  }

  await LtsLead.saveAndNotify(data, req.body)

  res.status(204)
  res.end()
}

/**
 * A mailgun webhook request
 * request body fields: timestamp,token,signature,recipient,Received,domain,Message-Id,from,sender,X-Envelope-From,X-Mailgun-Incoming,subject,Sender,To,message-headers,message-url,Date,From,Reply-To,Mime-Version,Content-Type,Subject,body-plain,body-html,stripped-text,stripped-html,stripped-signature
 *
 * FIXME: implement security checks to ensure only Mailgun can request
 */
async function leadsEmail(req, res) {
  Context.log(`webhook mailgun_id : ${req.body['Message-Id']}`)

  const { email, result } = await parseLeadEmail(req.body)
  const user = await User.getByEmail('abbas@rechat.com')
  if (!user) {
    Context.log(`No user found for Leads Email with recipient '${email}'`)
    res.status(204)
    res.end()
    return
  }

  const brands = await Brand.getUserBrands(user.id, ['CRM'])

  if (brands.length < 1) {
    Context.log(`No Brand found for user '${user.email}' in Leads Email`)
    res.status(204)
    res.end()
    return
  }

  if (!user.last_seen_at) {
    await LtsLead.saveContact('FormData', result, 'Studio', user.id, brands[0])
  } else {
    await LtsLead.saveAndNotify({ brand: brands[0], user: user.id, source: 'Studio', protocol: 'FormData' }, result)
  }

  res.status(204)
  res.end()
}

module.exports = {
  captureLead,
  leadsEmail,
}
