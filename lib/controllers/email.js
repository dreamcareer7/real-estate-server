const config    = require('../config')
const expect    = require('../utils/validator.js').expect
const promisify = require('../utils/promisify.js')
const am = require('../utils/async_middleware.js')

const Context = require('../models/Context')
const AttachedFile = require('../models/AttachedFile')
const ContactList = require('../models/Contact/list')
const EmailEvents = require('../models/Email/events')
const Email = require('../models/Email/get')
const EmailCampaign = require('../models/Email/campaign')
const EmailCampaignEmail = require('../models/Email/campaign/email')
const GoogleMessage = require('../models/Google/message')
const MicrosoftMessage = require('../models/Microsoft/message')
const Brand = require('../models/Brand')
const Crypto = require('../models/Crypto')

const { email_events } = require('../models/Email/campaign/notification/constants')

const pixelBuffer = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
])


const cleanString = function (input) {
  let output = ''

  for (let i = 0; i < input.length; i ++) {
    if (input.charCodeAt(i) <= 127) {
      output += input.charAt(i)
    }
  }

  return output.replace(/%20/g, ' ')
}

const downloadGmailAttachment = async function (req, res) {
  const att  = JSON.parse(Crypto.decrypt(decodeURIComponent(req.params.hash)))
  const gcid = att.google_credential
  const mid  = att.message_remote_id
  const aid  = att.attachment_id

  const { attachmentObj, attachment } = await GoogleMessage.downloadAttachment(gcid, mid, aid)

  // res.setHeader('Content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(cleanString(attachmentObj.name))}`)
  res.setHeader('Content-disposition', `attachment; filename="${cleanString(attachmentObj.name)}"`)
  res.setHeader('Content-type', attachmentObj.contentType)

  return res.send(Buffer.from(attachment.data, 'base64'))
}

const downloadOutlookAttachment = async function (req, res) {
  const att  = JSON.parse(Crypto.decrypt(decodeURIComponent(req.params.hash)))
  const mcid = att.microsoft_credential
  const mid  = att.message_remote_id
  const aid  = att.attachment_id
  
  const attachment = await MicrosoftMessage.downloadAttachment(mcid, mid, aid)

  // res.setHeader('Content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(cleanString(attachment.name))}`)
  res.setHeader('Content-disposition', `attachment; filename="${cleanString(attachment.name)}"`)
  res.setHeader('Content-type', attachment.contentType)

  return res.send(Buffer.from(attachment.contentBytes, 'base64'))
}


const recipientAccessControl = async (campaign) => {
  const {
    to = [],
    cc = [],
    bcc = []
  } = campaign

  const all = [].concat(to, cc, bcc)

  const lists = all
    .filter(r => r.list)
    .map(t => t.list)

  const access = await ContactList.hasAccess(campaign.brand, 'read', lists)

  if (Array.prototype.some.call(access.values(), x => !x))
    throw Error.Unauthorized('Access denied to one or more of the specified lists.')
}

const postEmails = async (req, res) => {
  const campaign = req.body

  campaign.created_by = req.user.id
  campaign.brand = Brand.getCurrent().id

  expect(campaign.brand).to.be.uuid
  expect(campaign.from, 'campaign.from must be a uuid').to.be.uuid

  await Brand.limitAccess({
    brand: campaign.brand,
    user: req.user.id
  })

  await Brand.limitAccess({
    brand: campaign.brand,
    user: campaign.from
  })

  const { to, tags } = campaign

  // https://app.mailgun.com/app/support/947351
  expect(to, 'To recipient is required').to.be.an('array').to.have.length.above(0)
  
  if (tags) {
    expect(tags, 'tags should be an array').to.be.an('array')
  }

  await recipientAccessControl(campaign)

  const [ id ] = await EmailCampaign.createMany([campaign])
  const saved = await EmailCampaign.get(id)

  res.model(saved)
}

const postIndividualEmails = async (req, res) => {
  const campaign = req.body

  campaign.created_by = req.user.id
  campaign.brand = Brand.getCurrent().id

  expect(campaign.brand).to.be.uuid
  expect(campaign.from).to.be.uuid

  expect(campaign.to).to.be.an('array')

  expect(campaign.cc).to.be.undefined
  expect(campaign.bcc).to.be.undefined

  campaign.individual = true

  if (campaign.tags) {
    expect(campaign.tags, 'tags should be an array').to.be.an('array')
  }

  await Brand.limitAccess({
    brand: campaign.brand,
    user: req.user.id
  })

  await Brand.limitAccess({
    brand: campaign.brand,
    user: campaign.from
  })

  await recipientAccessControl(campaign)

  const [ id ] = await EmailCampaign.createMany([campaign])
  const saved = await EmailCampaign.get(id)

  res.model(saved)
}

const attach = async (req, res) => {
  let fileSize = 0

  switch (req.query.origin) {
    case 'gmail': 
      fileSize = config.email_composer.attachment_upload_limit.gmail
      break

    case 'outlook':
      fileSize = config.email_composer.attachment_upload_limit.outlook
      break

    case 'mailgun':
      fileSize = config.email_composer.attachment_upload_limit.mailgun
      break

    default:
      fileSize = 15 * 1024 * 1024
  }

  const { file } = await promisify(AttachedFile.saveFromRequest)({
    path: req.user.id,
    req,
    relations: [{ role: 'User', role_id: req.user.id }],
    public: false,
    busboyOptions: { limits: { fileSize } }
  })

  res.model(file)
}

const getCampaign = async (req, res) => {
  const campaign = await EmailCampaign.get(req.params.id)

  await Brand.limitAccess({
    user: req.user.id,
    brand: campaign.brand
  })

  res.model(campaign)
}

const updateCampaign = async (req, res) => {
  expect(req.params.id).to.be.uuid

  const campaign = req.body
  const brand = Brand.getCurrent().id

  await Brand.limitAccess({ brand, user: req.user.id })

  if (campaign.from) {
    expect(campaign.from).to.be.uuid
    await Brand.limitAccess({ brand, user: campaign.from })
  } else {
    campaign.from = null
  }

  if (campaign.individual) {
    !expect(campaign.individual).to.be.a('boolean')
  }

  if (campaign.tags) {
    expect(campaign.tags, 'tags should be an array').to.be.an('array')
  }
  
  const updated = await EmailCampaign.update({
    id: req.params.id,
    ...campaign
  })

  await Brand.limitAccess({ user: req.user.id, brand: updated.brand })

  res.model(updated)
}

const deleteCampaign = async (req, res) => {
  const id = req.params.id
  expect(id).to.be.uuid

  const campaign = await EmailCampaign.get(id)

  await Brand.limitAccess({
    user: req.user.id,
    brand: campaign.brand
  })

  await EmailCampaign.deleteMany([id], req.user.id, campaign.brand)

  res.status(204)
  return res.end()
}

const getCampaigns = async (req, res) => {
  await Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand
  })

  const campaigns = await EmailCampaign.getByBrand(req.params.brand)

  res.collection(campaigns)
}

const getEmail = async(req, res) => {
  const email = await EmailCampaignEmail.get(req.params.email)

  expect(email.campaign).to.equal(req.params.id)

  const campaign = await EmailCampaign.get(email.campaign)

  await Brand.limitAccess({
    user: req.user.id,
    brand: campaign.brand
  })

  res.model(email)
}

const downloadAttachment = async(req, res) => {
  const att = JSON.parse(Crypto.decrypt(decodeURIComponent(req.params.hash)))
  const uts = new Date().getTime()

  if ( att.expires_at < uts ) {
    throw Error.BadRequest({ message: 'URL is expired!', slack: false })
  }

  if ( !att.google_credential && !att.microsoft_credential ) {
    throw Error.BadRequest('URL is not valid!')
  }

  try {

    if (att.google_credential) {
      return downloadGmailAttachment(req, res)
    }
  
    if (att.microsoft_credential) {
      return downloadOutlookAttachment(req, res)
    }

  } catch (err) {

    if ( err.statusCode === 404 || err.http === 404 ) {
      throw Error.ResourceNotFound(err.message)
    }

    throw Error.BadRequest('Download message\'s attachment failed!')
  }
}

const addEvent = async (req, res) => {
  expect(req.body).to.be.an('object')

  const e = req.body['event-data'] || {}
  const { message = {} } = e
  const { headers = {} } = message
  const email = headers['message-id']

  /*
   * https://app.mailgun.com/app/support/1000782
   * Sometimes they have no id!
   */
  if (!email) {
    throw Error.Validation({ slack: false, message: 'Cannot save event with no message id!' })
  }

  const event = {
    object: {
      ...e,
      origin: 'mailgun',
    },
    event: e.event,
    created_at: e.timestamp,
  }

  await EmailEvents.addEvent(event)

  res.end()
}

const pixelTracking = async function (req, res) {
  if (!req.params.data) {
    throw Error.Validation({ slack: false, message: 'Invalid data!' })
  }

  try {
    const object = JSON.parse(Crypto.decrypt(decodeURIComponent(req.params.data)))
  
    const event = {
      object: {
        ...object,
        headers: req.headers
      },
      event: email_events.opened,
      created_at: new Date().getTime() / 1000
    }
  
    await EmailEvents.addEvent(event)
  
    res.setHeader('Surrogate-Control', 'no-store')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    
    res.status(200).end(pixelBuffer,'binary')

  } catch (ex) {
    Context.log('pixelTracking-failed', JSON.stringify(req.headers), JSON.stringify(req.params))
    throw ex
  }
}

const linkProxy = async function (req, res) {
  if (!req.params.data) {
    throw Error.Validation({ slack: false, message: 'Invalid data!' })
  }

  try {
    const object = JSON.parse(Crypto.decrypt(decodeURIComponent(req.params.data)))

    const event = {
      object: {
        ...object,
        headers: req.headers
      },
      event: email_events.clicked,
      created_at: new Date().getTime() / 1000
    }
  
    await EmailEvents.addEvent(event)
  
    res.redirect(object.redirect)

  } catch (ex) {
    Context.log('linkProxy-failed', JSON.stringify(req.headers), JSON.stringify(req.params))
    throw ex
  }
}

const enableDisableNotification = async (req, res) => {
  expect(req.params.id).to.be.uuid

  const campaign = req.params.id
  const status   = Boolean(req.body.status)
  const brand    = Brand.getCurrent().id

  await Brand.limitAccess({ brand, user: req.user.id })
  await EmailCampaign.enableDisableNotification(campaign, status)

  return res.status(200).end()
}

const viewEmail = async (req, res) => {
  const { code } = req.query

  const {
    campaign: campaign_id,
    email_address
  } = JSON.parse(Crypto.decrypt(code))

  expect(campaign_id).not.to.be.null
  expect(email_address).not.to.be.null

  const email_campaign_email = await EmailCampaignEmail.find(campaign_id, email_address)
  const campaign = await EmailCampaign.get(email_campaign_email.campaign)

  expect(campaign.id).to.equal(campaign_id)
  expect(campaign.archive).to.be.true

  const email = await Email.get(email_campaign_email.email)

  res.header('Content-Type', 'text/html')
  res.write(email.html)
  res.end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/emails/view', am(viewEmail))

  app.post('/emails/events', am(addEvent))
  app.get('/emails/events/:data', am(pixelTracking))
  app.get('/emails/events/redirect/:data', am(linkProxy))

  app.get('/brands/:brand/emails/campaigns', auth, am(getCampaigns))
  app.post('/emails', auth, am(postEmails))
  app.get('/emails/:id', auth, am(getCampaign))
  app.get('/emails/:id/emails/:email', auth, am(getEmail))
  app.put('/emails/:id', auth, am(updateCampaign))
  app.delete('/emails/:id', auth, am(deleteCampaign))
  app.post('/emails/individual', auth, am(postIndividualEmails))
  app.post('/emails/attachments', auth, am(attach))
  app.get('/emails/attachments/:hash', am(downloadAttachment))
  app.put('/emails/:id/notifications', auth, am(enableDisableNotification))

}

module.exports = router
