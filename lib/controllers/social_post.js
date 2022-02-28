const Brand = require('../models/Brand')
const am = require('../utils/async_middleware.js')
const { create } = require('../models/SocialPost/create')
const { getByBrand, get } = require('../models/SocialPost/get')
const { update } = require('../models/SocialPost/update')
const { deletePost } = require('../models/SocialPost/delete')

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

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) {
    throw Error.BadRequest('Brand is not specified.')
  }

  return brand.id
}

/**
 * @param {IAuthenticatedRequest<unknown, unknown, unknown>} req
 * @param {IResponse} _
 * @param {NextFunction} next
 */
function brandAccess(req, _, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  Brand.limitAccess({ user, brand }).then(() => next(), next)
}

/**
 * @param {IAuthenticatedRequest<{ socialPostId: UUID }, {}, { tags: string[] }>} req
 * @param {IResponse} res
 */

const deleteSocialPost = async (req, res) => {
  const { socialPostId } = req.params

  const brand = getCurrentBrand()
  const user = req.user.id

  const socialPost = await get(socialPostId)

  if (socialPost.user !== user || socialPost.brand !== brand) {
    return res.error(Error.Unauthorized())
  }

  if (socialPost.deleted_at) {
    res.status(204)
    return res.end()
  }

  await deletePost({ brand, id: socialPostId })
  res.status(204)
  return res.end()
}

/**
 * @param {IAuthenticatedRequest<{}, {}, import('../models/SocialPost/types').SocialPostInsertInput>} req
 * @param {IResponse} res
 */

const createSocialPost = async (req, res) => {
  const brand = getCurrentBrand()
  const user = req.user.id

  const socialPostId = await create(user, brand, req.body)
  const created = await get(socialPostId)
  res.model(created)
}

/**
 * @param {IAuthenticatedRequest<{ socialPostId: UUID }, {}, {dueAt: number}>} req
 * @param {IResponse} res
 */
const updateSocialPost = async (req, res) => {
  const brand = getCurrentBrand()
  const user = req.user.id
  const id = req.params.socialPostId
  await update({ brand, user, dueAt: req.body.dueAt, id })
  const created = await get(id)
  res.model(created)
}

/**
 * @param {IAuthenticatedRequest<{}, import('../models/SocialPost/types').Filter, {}>} req
 * @param {IResponse} res
 */
const getSocialPost = async (req, res) => {
  const brand = getCurrentBrand()
  const rows = await getByBrand(brand, req.query)
  res.collection(rows)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/social-post', auth, brandAccess, am(createSocialPost))
  app.delete('/social-post/:socialPostId', auth, brandAccess, am(deleteSocialPost))
  app.put('/social-post/:socialPostId', auth, brandAccess, am(updateSocialPost))
  app.get('/social-post', auth, brandAccess, am(getSocialPost))
}

module.exports = router
