const b64 = require('base64url').default

const Brand = require('../../models/Brand')
const Context = require('../../models/Context')
const Crypto = require('../../models/Crypto')
const LtsLead = require('../../models/Contact/lead/save')
const User = require('../../models/User/get')

const parseLeadEmail = require('../../models/Contact/lead/email')
const { generateLtsLink } = require('../../models/Contact/lead/link')
const { getCurrentBrand } = require('./common')

async function captureLead(req, res) {
  const decrypted = Crypto.decrypt(b64.decode(req.params.key))

  /** @type {import('../../models/Contact/lead/types').ILtsLeadUrlMetadata} */
  let data
  try {
    data = {
      mls: ['NTREIS'],
      source: 'Website',
      ...JSON.parse(decrypted),
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
  const user = await User.getByEmail(email)
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

function generateLink(req, res) {
  const link = generateLtsLink({
    brand: getCurrentBrand(),
    user: req.user.id,
    mls: req.body.mls,
    protocol: req.body.protocol ?? 'JSON',
    source: req.body.source ?? 'Website',
    notify: req.body.notify ?? true
  })

  res.json({ link })
  res.end()
}

module.exports = {
  captureLead,
  leadsEmail,
  generateLink,
}
