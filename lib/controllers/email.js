const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const promisify = require('../utils/promisify.js')

const ContactList = require('../models/Contact/list')

const postEmails = async (req, res) => {
  const campaign = req.body

  campaign.created_by = req.user.id
  campaign.brand = Brand.getCurrent().id

  expect(campaign.brand).to.be.uuid
  expect(campaign.from).to.be.uuid
  expect(campaign.to).to.be.an('array')

  await Brand.limitAccess({
    brand: campaign.brand,
    user: campaign.from
  })

  const lists = campaign.to
    .filter(to => to.list)
    .map(t => t.list)

  const access = await ContactList.hasAccess(campaign.brand, 'read', lists)
  if (Array.prototype.some.call(access.values(), x => !x)) {
    throw Error.Unauthorized('Access denied to one or more of the specified lists.')
  }

  const saved = await EmailCampaign.createMany([campaign])

  res.model(saved)
}

const addEvent = async (req, res) => {
  expect(req.body).to.be.an('object')

  const e = req.body['event-data']

  const event = {
    email: e.message.headers['message-id'],
    event: e.event,
    created_at: e.timestamp,
    recipient: e.recipient
  }

  await Email.addEvent(event)

  res.end()
}

const attach = async (req, res) => {
  const { file } = await promisify(AttachedFile.saveFromRequest)({
    path: req.user.id,
    req,
    relations: [
      {
        role: 'User',
        role_id: req.user.id
      }
    ],
    public: false
  })

  res.model(file)
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/emails', auth, am(postEmails))
  app.post('/emails/attachments', auth, am(attach))
  app.post('/emails/events', am(addEvent))
}

module.exports = router
