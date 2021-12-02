const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')

const map = require('lodash/map')

const Orm = require('../models/Orm/context')

const SuperCampaign = {
  ...require('../models/Email/super_campaign/get'),
  ...require('../models/Email/super_campaign/update'),
  ...require('../models/Email/super_campaign/create'),
  ...require('../models/Email/super_campaign/filter'),
  ...require('../models/Email/super_campaign/eligibility'),
}

const Enrollment = {
  ...require('../models/Email/super_campaign/enrollment/get'),
  ...require('../models/Email/super_campaign/enrollment/upsert'),
  ...require('../models/Email/super_campaign/enrollment/delete'),
}

const Brand = {
  ...require('../models/Brand/access'),
  ...require('../models/Brand/get'),
  ...require('../models/Brand'),
}

/**
 * @template TParams
 * @template TQuery
 * @template TBody
 * @typedef {import('../../types/monkey/controller').IAuthenticatedRequest<TParams, TQuery, TBody>} IAuthenticatedRequest
 */

/**
 * @typedef {import('../models/Email/super_campaign/types').SuperCampaignApiInput} SuperCampaignApiInput
 * @typedef {import('../models/Email/super_campaign/types').SuperCampaignStored} SuperCampaignStored
 * @typedef {import('../models/Email/super_campaign/types').Filter} SuperCampaignFilter
 * @typedef {IAuthenticatedRequest<{}, {}, SuperCampaignFilter>} FilterRequest
 * @typedef {import('express-serve-static-core').NextFunction} NextFunction
 * @typedef {import('../../types/monkey/controller').IResponse} IResponse
 */

/** @returns {IBrand['id']} */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand?.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

/**
 * @param {IAuthenticatedRequest<unknown, unknown, unknown>} req
 * @param {IResponse} res
 * @param {NextFunction} next
 */
function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  Brand.limitAccess({ user, brand }).then(() => next(), next)
}

/**
 * @param {IBrand['id']} brandId
 * @param {string=} [msg]
 */
function ensureCurrentBrand (brandId, msg = 'Access Denied') {
  if (brandId !== getCurrentBrand()) {
    throw Error.Forbidden(msg)
  }
}

/**
 * @param {IBrand['id']} parentId
 * @param {IBrand['id'][]} brandIds
 * @param {string=} [msg]
 */
async function ensureChildrenOf (parentId, brandIds, msg) {
  for (const bid of [...new Set(brandIds)]) {
    if (bid === parentId) { continue }

    expect(bid).to.be.uuid
    
    const parentIds = await Brand.getParents(bid)
    if (parentIds.includes(parentId)) { continue }
    
    throw Error.Forbidden(msg ?? `Current brand is not parent of brand ${bid}`)
  }
}

/** 
 * @param {IBrand['id'][]} brandIds
 * @param {string=} [msg]
 */
async function ensureChildrenOfCurrentBrand (brandIds, msg) {  
  return ensureChildrenOf(getCurrentBrand(), brandIds, msg)
}

/**
 * @param {string[] | undefined | null} tags
 * @param {boolean=} [allowEmpty=true]
 */
function validateTags (tags, allowEmpty = true) {
  expect(tags, 'tags must be an array').to.be.an('array')

  if (!allowEmpty) {
    expect(tags, 'tags cannot be empty').not.to.be.empty
  }

  for (const t of tags ?? []) {
    expect(t?.trim?.(), 'tag must be a non-empty string')
      .to.be.a('string').that.is.not.empty 
  }
}

/** @param {SuperCampaignStored} superCampaign */
function ensureNonExecuted (superCampaign) {
  expect(superCampaign).to.be.an('object', 'Impossible state')
    .that.has.own.property(
      'executed_at', null,
      `Super Campaign ${superCampaign.id} already executed`
    )
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function get(req, res) {
  expect(req.params.id).to.be.uuid
  
  const superCampaign = await SuperCampaign.get(req.params.id)
  ensureCurrentBrand(superCampaign.brand)
  
  res.model(superCampaign)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function create(req, res) {
  const id = await SuperCampaign.create(req.body, req.user.id, getCurrentBrand())
  const created = await SuperCampaign.get(id)

  res.model(created)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function update(req, res) {
  const superCampaignId = req.params.id
  
  expect(superCampaignId).to.be.uuid
  const superCampaign = await SuperCampaign.get(superCampaignId)
  ensureCurrentBrand(superCampaign.brand)
  ensureNonExecuted(superCampaign)
  
  await SuperCampaign.update(superCampaignId, req.body)
  const updated = await SuperCampaign.get(superCampaignId)

  res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, { tags: string[] }>} req 
 * @param {IResponse} res 
 */
async function updateTags(req, res) {
  const superCampaignId = req.params.id
  const { tags } = req.body
  
  expect(superCampaignId).to.be.uuid
  const superCampaign = await SuperCampaign.get(superCampaignId)
  ensureCurrentBrand(superCampaign.brand)
  ensureNonExecuted(superCampaign)
  
  await SuperCampaign.updateTags(superCampaignId, tags)
  const updated = await SuperCampaign.get(superCampaignId)

  res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, { eligible_brands: UUID[] }>} req 
 * @param {IResponse} res 
 */
async function updateBrands(req, res) {
  const superCampaignId = req.params.id
  expect(superCampaignId).to.be.uuid
  
  const { eligible_brands } = req.body
  expect(eligible_brands).to.be.an('array')

  const superCampaign = await SuperCampaign.get(superCampaignId)
  ensureCurrentBrand(superCampaign.brand)
  ensureNonExecuted(superCampaign)
  
  await SuperCampaign.updateBrands(superCampaignId, req.body.eligible_brands)
  const updated = await SuperCampaign.get(superCampaignId)

  res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, PaginationOptions, {}>} req 
 * @param {IResponse} res 
 */
async function getEnrollments(req, res) {
  const superCampaignId = req.params.id
  
  expect(superCampaignId).to.be.uuid
  const superCampaign = await SuperCampaign.get(superCampaignId)
  ensureCurrentBrand(superCampaign.brand)

  const enrollments = await Enrollment.filter({
    ...req.query,
    super_campaign: req.params.id,
    including_deleted: true,
    order: ['-updated_at', '-created_at', '-deleted_at'],
  })

  res.collection(enrollments)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, SuperCampaignFilter>} req
 * @param {IResponse} res 
 */
async function filter(req, res) {
  const filterOpts = SuperCampaign.sanitizeFilterOptions(req.body)
  
  const superCampaigns = await SuperCampaign.filter({
    ...filterOpts,
    brand_in: [getCurrentBrand()],
  })

  res.collection(superCampaigns)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, PaginationOptions, {}>} req 
 * @param {IResponse} res 
 */
async function getResults(req, res) {
  expect(req.params.id).to.be.uuid
  throw Error.NotImplemented('Not implemented yet')
}

/**
 * @typedef {Object} EnrollRequestItem
 * @property {IBrand['id']} brand
 * @property {IUser['id']} user
 * @property {string[]} tags
 *
 * @typedef {Object} EnrollRequestBody
 * @property {EnrollRequestItem[]} enrollments
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, EnrollRequestBody>} req 
 * @param {IResponse} res 
 */
async function enroll(req, res) {
  const { id: super_campaign } = req.params
  const { enrollments: data } = req.body

  const superCampaign = await SuperCampaign.get(super_campaign)
  ensureCurrentBrand(superCampaign.brand)
  ensureNonExecuted(superCampaign)
  
  expect(data, 'You need to specify the array of new enrollments in the field `enrollments`').to.be.an('array').that.is.not.empty
  await ensureChildrenOfCurrentBrand(map(data, 'brand'))
  
  const inputs = data.map(({ brand, user, tags }) => {
    expect(brand).to.be.uuid
    expect(user).to.be.uuid
    validateTags(tags)
    // TODO: ensure that `user` belongs to the `brand`

    return { brand, user, tags, super_campaign, detached: false }
  })

  const ids = await Enrollment.upsertMany(inputs)
  const enrollments = await Enrollment.getAll(ids)

  res.status(201).collection(enrollments)
}

/**
 * @typedef {Object} EnrollMeRequestBody
 * @property {string[] | undefined} tags
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, EnrollMeRequestBody>} req 
 * @param {IResponse} res 
 */
async function enrollMe(req, res) {
  const superCampaignId = req.params.id
  
  const superCampaign = await SuperCampaign.get(superCampaignId)
  const tags = req.body.tags || superCampaign.tags

  await ensureChildrenOf(superCampaign.brand, [getCurrentBrand()])
  ensureNonExecuted(superCampaign)
  validateTags(tags)
  
  const [enrollmentId] = await Enrollment.upsertMany([{
    super_campaign: req.params.id,
    brand: getCurrentBrand(),
    user: req.user.id,
    tags: /** @type {string[]} */(tags),
    detached: true,
  }])
  const enrollment = await Enrollment.get(enrollmentId)

  res.model(enrollment)
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
  const { id: superCampaignId } = req.params
  const { user, brand } = req.body

  expect(user).to.be.uuid
  // TODO: ensure that `user` belongs to the `brand`
  await ensureChildrenOfCurrentBrand([brand])

  await Enrollment.deleteBy({ brandId: brand, userId: user, superCampaignId })

  res.status(204).end()
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function unenrollMe(req, res) {
  await Enrollment.deleteBy({
    brandId: getCurrentBrand(),
    userId: req.user.id,
    superCampaignId: req.params.id,
  })
  
  res.status(204).end()
}

/**
 * @param {IAuthenticatedRequest<{}, {}, {}>} _
 * @param {IResponse} res 
 */
async function myEligibleSuperCampaigns(_, res) {
  const brandId = getCurrentBrand()
  const allBrandIds = [...await Brand.getParents(brandId), brandId]
  const superCampaigns = await SuperCampaign.filter({
    brand_in: allBrandIds,
    executed: false,
    draft: false,
    order: ['-updated_at', '-created_at'],
  })

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
    executed: false,
    order: ['-updated_at', '-created_at', '-deleted_at'],
  })

  res.collection(enrollments)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req
 * @param {IResponse} res 
 */
async function getEligibleAgents (req, res) {
  const { id } = req.params
  
  const { brand: brandId } = await SuperCampaign.get(id)
  await ensureChildrenOfCurrentBrand([brandId])
  
  const eligibleBrandIds = await SuperCampaign.getEligibleBrands(id)
  if (!eligibleBrandIds.length) { return res.collection([]) }

  const agents = await SuperCampaign.getEligibleAgents(eligibleBrandIds)
  if (!agents.length) { return res.collection([]) }

  Orm.setAssociationConditions({ 'brand_role.members': map(agents, 'user') })

  const brandIds = [...new Set(map(agents, 'brand'))]
  const brands = await Brand.getAll(brandIds)

  res.collection(brands)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/email/super-campaigns/self', brandAccess, am(myEligibleSuperCampaigns))
  app.get('/email/super-campaigns/enrollments/self', brandAccess, am(myEnrollments))
  app.put('/email/super-campaigns/:id/enrollments/self', auth, brandAccess, am(enrollMe)) // For agent
  app.delete('/email/super-campaigns/:id/enrollments/self', auth, brandAccess, am(unenrollMe)) // For agent

  app.post('/email/super-campaigns', auth, brandAccess, am(create))
  app.get('/email/super-campaigns/:id', auth, brandAccess, am(get))
  app.put('/email/super-campaigns/:id', auth, brandAccess, am(update))
  app.put('/email/super-campaigns/:id/eligibility', auth, brandAccess, am(updateBrands))
  app.get('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(getEnrollments))

  app.put('/email/super-campaigns/:id/tags', auth, brandAccess, am(updateTags))

  app.post('/email/super-campaigns/filter', auth, brandAccess, am(filter))
  app.get('/email/super-campaigns/:id/results', auth, brandAccess, am(getResults))
  app.post('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(enroll)) // For admin
  app.delete('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(unenroll)) // For admin

  app.get('/email/super-campaigns/:id/eligible/agents', auth, brandAccess, am(getEligibleAgents))
}

module.exports = router
