const format = require('util').format
const AssertionError = require('assertion-error')

const reportActivity = (text) => {
  Slack.send({
    channel: '6-support',
    text: text,
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

  delete e.domain
  delete e.domainThrown
  delete e.domainEmitter
  delete e.domainBound

  const user = req.user ? (req.user.first_name + ' ' + req.user.last_name) : 'Guest'
  let text = '🆔 %s\n ✍ (Error %d) %s %s \n :memo: %s\n:person_with_blond_hair::skin-tone-5: %s\n 🌐 (%s)\n---\n'
  text = format(text, req.rechat_id, e.http, req.method, req.headers['host'] + req.path, e.message, user, req.headers['user-agent'])

  Slack.send({
    channel: '7-server-errors',
    text: text,
    emoji: ':skull_and_crossbones:'
  })
}

function middleware (req, res, next) {
  process.domain.on('error', reportHttpError.bind(null, req))
  next()
}

function reportSocketError (e, domain) {
  if (!e.http)
    e.http = 500

  if (e.http < 500)
    return

  delete e.domain
  delete e.domainThrown
  delete e.domainEmitter
  delete e.domainBound

  const user = process.domain.user ? (process.domain.user.first_name + process.domain.user.last_name) : 'Guest'
  const socket = process.domain.socket
  const headers = socket.request.headers

  let text = ':x: Socket:%s %s (Error %s)\n :memo: %s\n:person_with_blond_hair::skin-tone-5: %s (%s)\n---\n'
  text = format(text, process.domain.function, headers['host'], e.http, e.message, user, headers['user-agent'])
  Slack.send({
    channel: '7-server-errors',
    text: text,
    emoji: ':skull_and_crossbones:'
  })
}

const userCreated = (user_id) => {
  User.get(user_id, (err, user) => {
    if (err)
      return console.trace(err)

    const text = format('New User: %s as %s %s', user.display_name, user.user_type, user.is_shadow ? '(Invited)' : '')

    return reportActivity(text)
  })
}

const displayName = () => {
  const user = process.domain.user

  if (user)
    return user.first_name + ' ' + user.last_name

  return 'Unknown User'
}

const emailVerificationSent = (verification, email) => {
  const text = format('Email verification code sent to %s as requested by %s', verification.email, displayName())
  reportActivity(text)
}

const phoneVerificationSent = (verification) => {
  const text = format('Phone verification code sent to %s as requested by %s', verification.phone_number, displayName())
  reportActivity(text)
}

const emailVerified = (email) => {
  const text = format('Email %s verified (by user %s)', email, displayName())
  reportActivity(text)
}

const phoneVerified = (phone_number) => {
  const text = format('Phone %s verified (by user %s)', phone_number, displayName())
  reportActivity(text)
}

const getUserName = () => {
  if (process.domain && process.domain.user)
    return process.domain.user.display_name

  return 'Unknown User'
}

const dealCreated = deal => {
  const text = format('%s deal created by %s', deal.deal_type, getUserName())
  reportActivity(text)
}

const submissionCreated = submission => {
  const text = format('Form %s (%s) created by %s', submission.title, submission.state, getUserName())
  reportActivity(text)
}

const envelopeCreated = envelope => {
  const text = format('Envelope created by %s', getUserName())
  reportActivity(text)
}

const envelopeRecipientUpdated = ({recipient, envelope}) => {
  const text = format('envelope %s was %s', envelope.title, recipient.status)
  reportActivity(text)
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

  // We need SocketServer. Its not defined yet. It will be loaded 'after loading routes'.
  app.on('after loading routes', () => {
    SocketServer.on('transaction', (domain) => {
      domain.on('error', (e) => {
        reportSocketError(e, domain)
      })
    })
  })
}
