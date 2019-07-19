const format = require('util').format
const AssertionError = require('assertion-error')
const config = require('../config.js')
const Context = require('../models/Context')

const reportActivity = (options) => {
  Slack.send({
    ...options,
    channel: '6-support',
    emoji: ':chart_with_upwards_trend:'
  })
}

function reportHttpError (req, e) {
  if (e instanceof AssertionError)
    e = Error.Validation(e.message)

  if (!e.http)
    e.http = 500

  if (e.http === 404)
    return

  if (e.http === 401)
    return

  if (e.slack === false)
    return

  delete e.domain
  delete e.domainThrown
  delete e.domainEmitter
  delete e.domainBound

  const user = req.user ? (`<mailto:${req.user.email}|${req.user.first_name} ${req.user.last_name}>`) : 'Guest'
  let brand_line = ''
  
  try {
    const brand = Brand.getCurrent()
    brand_line = brand ? ` 👥 ${brand.name} (${brand.id})\n` : ''
  }
  catch (ex) {
    console.error(ex)
  }

  let req_details_url = ''
  
  if (req.rechat_id) {
    let enc_rechat_id
    try {
      enc_rechat_id = encodeURIComponent(Crypto.encrypt(req.rechat_id))
    }
    catch (ex) {
      console.error(ex)
    }

    const baseUrl = config.url.protocol + '://' + config.url.hostname + '/_'
    req_details_url = enc_rechat_id ? 
      ` (${baseUrl}/requests/${enc_rechat_id})` :
      ''
  }

  const req_id_line = req.rechat_id + req_details_url

  let text = '🆔 %s\n ✍ (Error %d) %s %s \n :memo: %s\n:person_with_blond_hair::skin-tone-5: %s\n%s 🌐 (%s)\n---\n'
  text = format(text, req_id_line, e.http, req.method, req.headers['host'] + req.path, e.message, user, brand_line, req.headers['user-agent'])

  Slack.send({
    channel: '7-server-errors',
    text: text,
    emoji: ':skull_and_crossbones:'
  })
}

function middleware (req, res, next) {
  const active = Context.getActive()
  active.on('error', reportHttpError.bind(null, req))
  next()
}

function reportSocketError (e, context) {
  if (!e.http)
    e.http = 500

  if (e.http < 500)
    return

  delete e.domain
  delete e.domainThrown
  delete e.domainEmitter
  delete e.domainBound

  const user = context.get('user')
  const username = user ? `<mailto:${user.email}|${user.display_name}>` : 'Guest'
  const socket = context.get('name')
  const headers = socket.request.headers
  const fn = context.get('function')

  let text = ':x: Socket:%s %s (Error %s)\n :memo: %s\n:person_with_blond_hair::skin-tone-5: %s (%s)\n---\n'
  text = format(text, fn, headers['host'], e.http, e.message, username, headers['user-agent'])
  Slack.send({
    channel: '7-server-errors',
    text: text,
    emoji: ':skull_and_crossbones:'
  })
}

const userCreated = (user_id) => {
  User.get(user_id).nodeify((err, user) => {
    if (err)
      return console.trace(err)

    const text = format('New User: %s as %s %s', user.display_name, user.user_type, user.is_shadow ? '(Invited)' : '')

    return reportActivity({ text })
  })
}

const displayName = () => {
  const user = Context.get('user')

  if (user)
    return `<mailto:${user.email}|${user.display_name}>`

  return 'Unknown User'
}

const emailVerificationSent = (verification) => {
  const text = format('Email verification code sent to %s as requested by %s', verification.email, displayName())
  reportActivity({ text })
}

const phoneVerificationSent = (verification) => {
  const text = format('Phone verification code sent to %s as requested by %s', verification.phone_number, displayName())
  reportActivity({ text })
}

const emailVerified = (email) => {
  const text = format('Email %s verified (by user %s)', email, displayName())
  reportActivity({ text })
}

const phoneVerified = (phone_number) => {
  const text = format('Phone %s verified (by user %s)', phone_number, displayName())
  reportActivity({ text })
}

const getUserName = () => {
  const user = Context.get('user')
  if (user)
    return `<mailto:${user.email}|${user.display_name}>`

  return 'Unknown User'
}

const dealCreated = deal => {
  const text = format('%s deal created by %s', deal.deal_type, getUserName())
  reportActivity({ text })
}

const submissionCreated = submission => {
  const text = format('Form %s (%s) created by %s', submission.title, submission.state, getUserName())
  reportActivity({ text })
}

const envelopeCreated = envelope => {
  const url = Url.web({
    uri: `/dashboard/deals/${envelope.deal}`
  })

  const text = format('Envelope "<%s|%s>" created by %s', url, envelope.title, getUserName())
  reportActivity({ text })
}

const envelopeRecipientUpdated = ({recipient, envelope}) => {
  const text = format('envelope %s was %s', envelope.title, recipient.status)
  reportActivity({ text })
}

const templateInstanceCreated = ({instance, template, created_by, file}) => {
  const text = `Template ${template.name} (${template.variant}, ${template.medium}) created by <mailto:${created_by.email}|${created_by.display_name}> (<${file.url}|Link>)`

  reportActivity({
    attachments: [{
      pretext: text,
      image_url: file.url
    }]
  })
}

module.exports = (app) => {
  app.use(middleware)

  EmailVerification.on('email verification sent', emailVerificationSent)
  PhoneVerification.on('phone verification sent', phoneVerificationSent)

  EmailVerification.on('email verified', emailVerified)
  PhoneVerification.on('phone verified', phoneVerified)

  User.on('user created', userCreated)

  Deal.on('deal created', dealCreated)
  Form.on('submission created', submissionCreated)
  Envelope.on('envelope created', envelopeCreated)
  Envelope.on('envelope recipient updated', envelopeRecipientUpdated)

  TemplateInstance.on('created', templateInstanceCreated)

  // We need SocketServer. Its not defined yet. It will be loaded 'after loading routes'.
  app.on('after loading routes', () => {
    SocketServer.on('transaction', (context) => {
      context.on('error', (e) => {
        reportSocketError(e, context)
      })
    })
  })
}
