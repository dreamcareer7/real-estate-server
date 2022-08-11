const Brand = require('../models/Brand')

const Facebook = {
  create: require('../models/SocialPost/create').create,
  ...require('../models/SocialPost/get'),
  update: require('../models/SocialPost/update').update,
  deletePost: require('../models/SocialPost/delete').deletePost
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
 * @param {IAuthenticatedRequest<{ socialPostId: UUID, brand: UUID }, {}, { tags: string[] }>} req
 * @param {IResponse} res
 */

const deleteSocialPost = async (req, res) => {
  const { socialPostId } = req.params

  const brand = req.params.brand
  const user = req.user.id

  const socialPost = await Facebook.get(socialPostId)

  if (socialPost.created_by !== user || socialPost.brand !== brand) {
    return res.error(Error.Unauthorized())
  }

  if (socialPost.deleted_at) {
    res.status(404)
    return res.end()
  }

  await Facebook.deletePost({ brand, id: socialPostId })
  res.status(204)
  return res.end()
}

/**
 * @param {IAuthenticatedRequest<{brand: UUID}, {}, import('../models/SocialPost/types').SocialPostInsertInput>} req
 * @param {IResponse} res
 */

const createSocialPost = async (req, res) => {
  const brand = req.params.brand
  const user = req.user.id

  const socialPostId = await Facebook.create(user, brand, req.body)
  const created = await Facebook.get(socialPostId)
  res.model(created)
}

/**
 * @param {IAuthenticatedRequest<{ socialPostId: UUID, brand: UUID }, {}, {due_at: number}>} req
 * @param {IResponse} res
 */
const updateSocialPost = async (req, res) => {
  const brand = req.params.brand
  const user = req.user.id
  const id = req.params.socialPostId
  await Facebook.update({ brand, user, dueAt: req.body.due_at, id })
  const created = await Facebook.get(id)
  res.model(created)
}

/**
 * @param {IAuthenticatedRequest<{brand: UUID}, import('../models/SocialPost/types').Filter, {}>} req
 * @param {IResponse} res
 */
const getSocialPost = async (req, res) => {
  const brand = req.params.brand
  const rows = await Facebook.getByBrand(brand, req.query)
  res.collection(rows)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/brands/:brand/social-post', auth, brandAccess, createSocialPost)
  app.delete('/brands/:brand/social-post/:socialPostId', auth, brandAccess, deleteSocialPost)
  app.put('/brands/:brand/social-post/:socialPostId', auth, brandAccess, updateSocialPost)
  app.get('/brands/:brand/social-post', auth, brandAccess, getSocialPost)
}

module.exports = router
