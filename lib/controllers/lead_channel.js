const Brand = require('../models/Brand')
const basicAuth = require('../auth/basicAuth')
const config = require('../config')
const Context = require('../models/Context')
const request = require('request-promise-native')
const LeadChannel = {
  ...require('../models/Contact/lead/channel/create'),
  ...require('../models/Contact/lead/channel/get'),
  ...require('../models/Contact/lead/channel/delete'),
  ...require('../models/Contact/lead/channel/update'),
  ...require('../models/Contact/lead/channel/Zillow/worker'),
}

/**
 * @template TParams
 * @template TQuery
 * @template TBody
 * @typedef {import('../../types/monkey/controller').IAuthenticatedRequest<TParams, TQuery, TBody>} IAuthenticatedRequest
 */

/**
 * @typedef {import('express-serve-static-core').NextFunction} NextFunction
 */

/**
 * @typedef {import('../../types/monkey/controller').IResponse} IResponse
 */

/**
 * @param {IAuthenticatedRequest<{ brand: UUID }, unknown, unknown>} req
 * @param {IResponse} res
 * @param {NextFunction} next
 */
async function brandAccess(req, res, next) {
  await Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand,
  })
  next()
}

/**
 * @param {IAuthenticatedRequest<{brand: UUID}, {}, import('../models/Contact/lead/channel/types').LeadChannelInput>} req
 * @param {IResponse} res
 */
const createLeadChannel = async (req, res) => {
  const id = await LeadChannel.create(req.body, req.user.id, req.params.brand)
  const row = await LeadChannel.get(id)
  res.model(row)
}

/**
 * @param {IAuthenticatedRequest<{brand: UUID, id: UUID}, {}, {}>} req
 * @param {IResponse} res
 */
const deleteLeadChannel = async (req, res) => {
  await LeadChannel.deleteById(req.params.id, req.user.id)
  res.status(204)
  return res.end()
}

/**
 * @param {IAuthenticatedRequest<{brand: UUID, id: UUID}, {}, {brand: UUID}>} req
 * @param {IResponse} res
 */

const updateLeadChannel = async (req, res) => {
  await LeadChannel.update(req.params.id, req.user.id, req.body.brand)
  const row = await LeadChannel.get(req.params.id)
  res.model(row)
}

/**
 * @param {IAuthenticatedRequest<{brand: UUID}, import('../models/Contact/lead/channel/types').Filter, {}>} req
 * @param {IResponse} res
 */

const getLeadChannel = async (req, res) => {
  const brand = req.params.brand
  const rows = await LeadChannel.getByBrand(brand, req.query)
  res.collection(rows)
}

/**
 * @param {IAuthenticatedRequest<{brand: UUID}, {}, {}>} req
 * @param {IResponse} res
 */

const captureZillowLead = async (req, res) => {
  await LeadChannel.captureZillowLead(req.body)
  res.end()
}

const snsConfirmHandler = async (req, res, next) => {
  // https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.prepare.html
  Context.log(`zillow endpoint is called with header ${req.headers['x-amz-sns-message-type']}`)
  Context.log(`zillow endpoint is called with body ${JSON.stringify(req.body, null, 2)}`)

  if (req.headers['x-amz-sns-message-type'] === 'SubscriptionConfirmation') {
    const subscribeUrl = req?.body?.SubscribeURL
    if (subscribeUrl) {
      const options = {
        method: 'GET',
        uri: subscribeUrl,
      }

      try {
        await request(options)
        return res.send('Subscribed')
      } catch (error) {
        return next(error)
      }
    }
  }
  next()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/brands/:brand/leads/channels', auth, brandAccess, createLeadChannel)
  app.delete('/brands/:brand/leads/channels/:id', auth, brandAccess, deleteLeadChannel)
  app.put('/brands/:brand/leads/channels/:id', auth, brandAccess, updateLeadChannel)
  app.get('/brands/:brand/leads/channels', auth, brandAccess, getLeadChannel)
  app.post(
    '/leads/channels/zillow',
    basicAuth({
      user: config.zillow_sns.user,
      pass: config.zillow_sns.pass,
    }),
    snsConfirmHandler,
    captureZillowLead
  )
}
module.exports = router
