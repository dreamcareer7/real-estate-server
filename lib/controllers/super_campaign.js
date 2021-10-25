const isString = require('lodash/isString')
const isEmpty = require('lodash/isEmpty')

const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')

const SuperCampaign = {
  ...require('../models/Email/super_campaign/get'),
  ...require('../models/Email/super_campaign/update'),
  ...require('../models/Email/super_campaign/create'),
  ...require('../models/Email/super_campaign/filter'),
}

const Enrollment = {
  ...require('../models/Email/super_campaign/enrollment/get'),
  ...require('../models/Email/super_campaign/enrollment/upsert'),
  ...require('../models/Email/super_campaign/enrollment/delete'),
}

const Brand = {
  ...require('../models/Brand/access'),
  ...require('../models/Brand/get'),
}

/**
 * @template TParams
 * @template TQuery
 * @template TBody
 * @typedef {import('../../types/monkey/controller').IAuthenticatedRequest<TParams, TQuery, TBody>} IAuthenticatedRequest
 */

/**
 * @typedef {import('../../types/monkey/controller').IResponse} IResponse
 * @typedef {import('../models/Email/super_campaign/types').Filter} SuperCampaignFilter
 * @typedef {IAuthenticatedRequest<{}, {}, SuperCampaignFilter>} FilterRequest
 */

/** @returns {IBrand['id']} */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

async function ensureChildOfCurrentBrand (brandId) {
  const currBrandId = getCurrentBrand()
  const parentIds = await Brand.getParents(brandId)

  if (parentIds.includes(currBrandId)) {
    return
  }

  throw Error.Forbidden(`Current brand is not parent of brand ${brandId}`)
}

/**
 * @param {any} value
 * @param {string} name
 */
function validateNonemptyString (value, name) {
  if (typeof value !== 'string' || !value.length) {
    throw Error.Validation(`'${name}' must be a non-empty string`)
  }
}

/** @param {string[]} tags */
function validateTags (tags) {
  if (!Array.isArray(tags) || isEmpty(tags) ||
      tags.some(t => !isString(t) || isEmpty(t))) {
    throw Error.Validation(
      '`tags` must be a non-empty array of non-empty strings'
    )
  }
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function get(req, res) {
  expect(req.params.id).to.be.uuid
  const showing = await SuperCampaign.get(req.params.id)
  res.model(showing)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, import('../models/Email/super_campaign/types').SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function create(req, res) {
  const id = await SuperCampaign.create(req.body, req.user.id, getCurrentBrand())

  const created = await SuperCampaign.get(id)

  return res.model(created)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, import('../models/Email/super_campaign/types').SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function update(req, res) {
  expect(req.params.id).to.be.uuid
  
  await SuperCampaign.update(req.params.id, req.body)
  const updated = await SuperCampaign.get(req.params.id)

  return res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, { tags: string[] }} req 
 * @param {IResponse} res 
 */
async function updateTags(req, res) {
  expect(req.params.id).to.be.uuid

  await SuperCampaign.updateTags(req.params.id, req.body.tags)
  const updated = await SuperCampaign.get(req.params.id)

  return res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, { eligible_brands: UUID[] }>} req 
 * @param {IResponse} res 
 */
async function updateBrands(req, res) {
  expect(req.params.id).to.be.uuid
  expect(req.body.eligible_brands).to.be.an('array')

  await SuperCampaign.updateBrands(req.params.id, req.body.eligible_brands)
  const updated = await SuperCampaign.get(req.params.id)

  return res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, PaginationOptions, {}>} req 
 * @param {IResponse} res 
 */
async function getEnrollments(req, res) {
  expect(req.params.id).to.be.uuid

  const enrollments = await Enrollment.filter({
    ...req.query,
    super_campaign: req.params.id,
  })

  res.collection(enrollments)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, SuperCampaignFilter>} req
 * @param {IResponse} res 
 */
async function filter(req, res) {
  const filterOpts = SuperCampaign.sanitizeFilterOptions(req.body)
  const superCampaigns = await SuperCampaign.filter(filterOpts)

  res.collection(superCampaigns)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, PaginationOptions, {}>} req 
 * @param {IResponse} res 
 */
async function getResults(req, res) {
  expect(req.params.id).to.be.uuid

  res.end()
}

/**
 * @typedef {Object} EnrollRequestBody
 * @property {IBrand['id']} brand
 * @property {IUser['id']} user
 * @property {string[]} tags
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, EnrollRequestBody>} req 
 * @param {IResponse} res 
 */
async function enroll(req, res) {
  const { id: super_campaign } = req.params
  const { user, brand, tags } = req.body

  validateNonemptyString(user, 'user')
  validateNonemptyString(brand, 'brand')
  validateTags(tags)
  // TODO: ensure that `user` belongs to the `brand`
  ensureChildOfCurrentBrand(brand)

  const [enrollmentId] = await Enrollment.upsertMany([
    { super_campaign, user, brand, tags }
  ])
  const enrollment = await Enrollment.get(enrollmentId)

  res.status(201) // XXX: always 201? even in case of update?
    .model(enrollment)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function enrollMe(req, res) {
  res.end()
}

/**
 * @typedef {Object} UnenrollRequestBody
 * @property {string} user
 * @property {string} brand
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, UnenrollRequestBody>} req 
 * @param {IResponse} res 
 */
async function unenroll(req, res) {
  const { id: super_campaign } = req.params
  const { user, brand } = req.body

  validateNonemptyString(user, 'user')
  validateNonemptyString(brand, 'brand')
  // TODO: ensure that `user` belongs to the `brand`
  ensureChildOfCurrentBrand(brand)  

  await Enrollment.deleteBy({
    brandId: brand,
    userId: user,
    superCampaignId: super_campaign,
  })

  res.status(204).end()
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function unenrollMe(req, res) {
  // requires access control on the super campaign
  res.end()
}

/**
 * @param {IAuthenticatedRequest<{}, {}, {}>} _
 * @param {IResponse} res 
 */
async function myEligibleSuperCampaigns(_, res) {
  const brandId = getCurrentBrand()
  const allBrandIds = [...await Brand.getParents(brandId), brandId]
  const superCampaigns = await SuperCampaign.filter({ brand_in: allBrandIds })

  res.collection(superCampaigns)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, {}>} req
 * @param {IResponse} res 
 */
async function myEnrollments (req, res) {
  const enrollments = await Enrollment.filter({
    brand: getCurrentBrand(),
    user: req.user.id,
  })

  res.collection(enrollments)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  // Implemented and working
  app.post('/email/super-campaigns', auth, brandAccess, am(create))
  app.get('/email/super-campaigns/:id', auth, brandAccess, am(get))
  app.put('/email/super-campaigns/:id', auth, brandAccess, am(update))
  app.put('/email/super-campaigns/:id/eligibility', auth, brandAccess, am(updateBrands))
  app.get('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(getEnrollments))

  // To be fixed & test covered:
  app.put('/email/super-campaigns/:id/tags', auth, brandAccess, am(updateTags))

  // To be implemented:
  app.post('/email/super-campaigns/filter', auth, brandAccess, am(filter))
  app.get('/email/super-campaigns/:id/results', auth, brandAccess, am(getResults))
  app.post('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(enroll)) // For admin
  app.delete('/email/super-campaigns/:id/enrollments/:enrollment', auth, brandAccess, am(unenroll)) // For admin

  app.put('/email/super-campaigns/:id/enrollments/me', auth, brandAccess, am(enrollMe)) // For agent
  app.delete('/email/super-campaigns/:id/enrollments/me', auth, brandAccess, am(unenrollMe)) // For agent
  app.get('/email/super-campaigns/me', brandAccess, am(myEligibleSuperCampaigns))
  app.get('/email/super-campaigns/enrollments/me', brandAccess, am(myEnrollments))
}

module.exports = router
