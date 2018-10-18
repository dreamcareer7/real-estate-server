const crypto = require('crypto')
const request = require('request-promise-native')

const querystring = require('querystring')
const getRawBody = require('raw-body')

const config = require('../config')

const am = require('../utils/async_middleware')

const Context = require('../models/Context')

const {
  deleteDeal,
  undeleteDeal,
  changeEnderType,
  switchPrimaryAgent,
  setDealBrand,
  moveDealsToBrand
} = require('../models/SupportBot/deal')

const {
  disconnectDocuSign,
  moveCRMDataForUser
} = require('../models/SupportBot/user')

const { command: getToken } = require('../models/SupportBot/token')
const { command: getUser } = require('../models/SupportBot/get_user')
const { command: getDeal } = require('../models/SupportBot/get_deal')
const { command: searchDeals } = require('../models/SupportBot/search_deals')
const { command: setupClayStapp } = require('../models/SupportBot/claystapp')
const { command: openMoveContacts } = require('../models/SupportBot/move_contacts')
const { command: openMoveDeals } = require('../models/SupportBot/move_deals')
const { command: unfurlLink } = require('../models/SupportBot/unfurl')

/**
 * Parses raw bodies of requests
 *
 * @param {string} body - Raw body of request
 * @returns {Object} Parsed body of the request
 */
function parseBody(body) {
  const parsedBody = querystring.parse(body)
  if (parsedBody.payload) {
    return JSON.parse(parsedBody.payload)
  }

  return parsedBody
}

/**
 * Method to verify signature of requests
 *
 * @param {string} signingSecret - Signing secret used to verify request signature
 * @param {Object} requestHeaders - Request headers
 * @param {string} body - Raw body string
 * @returns {boolean} Indicates if request is verified
 */
function verifyRequestSignature(signingSecret, requestHeaders, body) {
  // Request signature
  const signature = requestHeaders['x-slack-signature']
  // Request timestamp
  const ts = requestHeaders['x-slack-request-timestamp']

  // Divide current date to match Slack ts format
  // Subtract 5 minutes from current time
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5

  if (ts < fiveMinutesAgo) {
    Context.log('request is older than 5 minutes')
    const error = new Error('Slack request signing verification failed')
    // error.code = errorCodes.REQUEST_TIME_FAILURE
    throw error
  }

  const hmac = crypto.createHmac('sha256', signingSecret)
  const [version, hash] = signature.split('=')
  hmac.update(`${version}:${ts}:${body}`)

  if (hash !== hmac.digest('hex')) {
    Context.log('request signature is not valid')
    const error = new Error('Slack request signing verification failed')
    // error.code = errorCodes.SIGNATURE_VERIFICATION_FAILURE
    throw error
  }

  Context.log('request signing verification success')

  return true
}

function auth(req, res, next) {
  const secret = config.slack.support.signing_secret
  const enabled = config.slack.support.enabled

  if (!enabled) {
    res.end('SupportBot disabled')
    return next()
  }

  if (req.is('json')) {
    if (!verifyRequestSignature(secret, req.headers, req.rawBody)) {
      res.end('Auth error')
    }

    return next()
  }

  getRawBody(req, (err, r) => {
    if (err) {
      res.end('Auth error')
      return next()
    }

    req.rawBody = r.toString()
    if (!verifyRequestSignature(secret, req.headers, req.rawBody)) {
      res.status(200)
      res.end('Auth error')
    }

    req.body = parseBody(req.rawBody)
    next()
  })
}

async function commandToken(req, res) {
  const email = req.body.text

  res.json(await getToken(email))
}

async function commandGetUser(req, res) {
  const email = req.body.text

  const user = await getUser(email)

  res.json(user)
}

async function commandGetDeal(req, res) {
  const deal_id = req.body.text

  const msg = await getDeal(deal_id)
  res.json(msg)
}

async function commandSearchDeals(req, res) {
  const query = req.body.text

  const msg = await searchDeals(query)
  res.json(msg)
}

async function commandSetupClayStapp(req, res) {
  const trigger_id = req.body.trigger_id

  await setupClayStapp(trigger_id)

  res.end()
}

async function handleUndeleteDealAction(payload) {
  const deal_id = payload.actions[0].value
  await undeleteDeal(deal_id)

  const msg = await getDeal(deal_id)
  return {
    ...msg,
    replace_original: true
  }
}

async function handleDeleteDealAction(payload) {
  const deal_id = payload.actions[0].value
  await deleteDeal(deal_id)

  const msg = await getDeal(deal_id)
  return {
    ...msg,
    replace_original: true
  }
}

async function handleChangeDealEnderTypeAction(payload) {
  const deal_id = payload.callback_id.slice('Deal:'.length)
  const selected_option = payload.actions[0].selected_options[0].value

  await changeEnderType(deal_id, selected_option)

  const msg = await getDeal(deal_id)
  return {
    ...msg,
    replace_original: true
  }
}

async function handleChangePrimaryAgentAction(payload) {
  const deal_id = payload.callback_id.split(':')[1]
  const old_pa = payload.callback_id.split(':')[2]
  const new_pa = payload.actions[0].selected_options[0].value

  await switchPrimaryAgent(old_pa, new_pa)

  const msg = await getDeal(deal_id)
  return {
    ...msg,
    replace_original: true
  }
}

async function handleChangeDealBrandAction(payload) {
  const deal_id = payload.callback_id.split(':')[1]
  const selected_option = payload.actions[0].selected_options[0].value

  await setDealBrand(deal_id, selected_option)

  const msg = await getDeal(deal_id)
  return {
    ...msg,
    replace_original: true
  }
}

async function handleOpenMoveContacts(payload) {
  const user_id = payload.actions[0].value
  const trigger_id = payload.trigger_id

  await openMoveContacts(user_id, trigger_id)
}

async function handleMoveContacts(user_id, submission) {
  const brand_id = submission.brand

  return moveCRMDataForUser(user_id, brand_id)
}

async function handleOpenMoveDeals(payload) {
  const user_id = payload.actions[0].value
  const trigger_id = payload.trigger_id

  await openMoveDeals(user_id, trigger_id)
}

async function handleMoveDeals(user_id, submission) {
  return moveDealsToBrand(user_id, submission.from_brand, submission.to_brand)
}

async function handleDisconnectDocuSign(payload) {
  const email = payload.actions[0].value
  await disconnectDocuSign(email)

  const msg = await getUser(email)
  return {
    ...msg,
    replace_original: true
  }
}

async function actions(req, res) {
  Context.log(JSON.stringify(req.body, null, 2))

  switch (req.body.type) {
    case 'dialog_submission':
      const {
        callback_id,
        state,
        submission
      } = req.body.submission

      switch (callback_id) {
        case 'move-contacts':
          await handleMoveContacts(state, submission)
          break
        case 'move-deals':
          await handleMoveDeals(state, submission)
          break
        default:
          break
      }
      res.end()

      break
    case 'interactive_message':
      switch (req.body.actions[0].name) {
        case 'undelete-deal':
          res.json(await handleUndeleteDealAction(req.body))
          break
        case 'delete-deal':
          res.json(await handleDeleteDealAction(req.body))
          break
        case 'change_deal_ender_type':
          res.json(await handleChangeDealEnderTypeAction(req.body))
          break
        case 'change_deal_primary_agent':
          res.json(await handleChangePrimaryAgentAction(req.body))
          break
        case 'change_deal_brand':
          res.json(await handleChangeDealBrandAction(req.body))
          break
        case 'disconnect-docusign':
          res.json(await handleDisconnectDocuSign(req.body))
          break
        case 'open-move-contacts':
          await handleOpenMoveContacts(req.body)
          res.end()
          break
        case 'open-move-deals':
          await handleOpenMoveDeals(req.body)
          res.end()
          break
        case 'unfurl_view_deal':
          await handleUnfurlViewDealActions(req.body)
          res.end()
          break
        default:
          return res.json({
            response_type: 'ephemeral',
            replace_original: false,
            text: 'Hmm, interesting!'
          })
      }
      break
    default:
      res.json({
        response_type: 'ephemeral',
        replace_original: false,
        text: 'Hmm, interesting!'
      })
  }
}

async function handleUnfurlViewDealActions(payload) {
  const deal_id = payload.callback_id.slice('Deal:'.length)
  const msg = await getDeal(deal_id)
  const { response_url } = payload

  Context.log(JSON.stringify(msg, null, 2))
  await request({
    uri: response_url,
    method: 'POST',
    body: {
      ...msg.attachments[1],
      replace_original: true
    },
    json: true
  })
}

async function unfurl(req, res) {
  if (req.body.challenge) {
    return res.json({ challenge: req.body.challenge })
  }

  await unfurlLink(req.body)

  Context.log(JSON.stringify(req.body, null, 2))
  res.end()
}

const router = app => {
  app.post('/_/slack/token', auth, am(commandToken))
  app.post('/_/slack/user/get', auth, am(commandGetUser))
  app.post('/_/slack/deal/get', auth, am(commandGetDeal))
  app.post('/_/slack/deal/search', auth, am(commandSearchDeals))
  app.post('/_/slack/claystapp/setup', auth, am(commandSetupClayStapp))
  app.post('/_/slack/buttons', auth, am(actions))
  app.post('/_/slack/unfurl', am(unfurl))
}

module.exports = router
