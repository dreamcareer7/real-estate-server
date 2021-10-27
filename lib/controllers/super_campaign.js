const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')

const SuperCampaign = {
  ...require('../models/Email/super_campaign/get'),
  ...require('../models/Email/super_campaign/update'),
  ...require('../models/Email/super_campaign/create')
}

const Enrollment = {
  ...require('../models/Email/super_campaign/enrollment/get')
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
 */

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

  const enrollments = await Enrollment.filterBySuperCampaign(req.params.id, req.query)

  res.collection(enrollments)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function enroll(req, res) {
  res.end()
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function unenroll(req, res) {
  res.end()
}

// /**
//  * @param {IAuthenticatedRequest<{}, {}, import('../models/Email/super_campaign/types').Filter>} req 
//  * @param {IResponse} res 
//  */
// async function filter(req, res) {
//   const { ids } = await SuperCampaign.filter(req.body, req.user.id, getCurrentBrand())

//   const super_campaigns = await SuperCampaign.getAll(ids)

//   return res.collection(super_campaigns)
// }

const router = function (app) {
  const auth = app.auth.bearer.middleware

  // app.post('/email/super-campaigns/filter', auth, brandAccess, am(filter))
  app.post('/email/super-campaigns', auth, brandAccess, am(create))
  app.get('/email/super-campaigns/:id', auth, brandAccess, am(get))
  app.put('/email/super-campaigns/:id', auth, brandAccess, am(update))
  app.put('/email/super-campaigns/:id/tags', auth, brandAccess, am(updateTags))
  app.put('/email/super-campaigns/:id/eligibility', auth, brandAccess, am(updateBrands))
  app.get('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(getEnrollments))
  app.post('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(enroll))
  app.delete('/email/super-campaigns/:id/enrollments/:enrollment', auth, brandAccess, am(unenroll))
}

module.exports = router
