const promisify = require('../../utils/promisify')

const Brand = require('../../models/Brand/index')
const BrandRole = require('../../models/Brand/role/members')
const BrandUser = require('../../models/Brand/user/invite')
const AttachedFile = require('../../models/AttachedFile')
const Orm = require('../../models/Orm/context')
const User = {
  ...require('../../models/User/get'),
  ...require('../../models/User/patch'),
  ...require('../../models/User/create'),
}

const patchUserAvatars = promisify(User.patchAvatars)

/**
 * @template P
 * @template Q
 * @template B
 * @typedef {import('../../../types/monkey/controller').IAuthenticatedRequest<P, Q, B>} IAuthenticatedRequest
 */
/** @typedef {import('../../../types/monkey/controller').IResponse} IResponse */

/**
 * @param {object} args
 * @param {IUser['id']} args.user
 * @param {IUser['email']} args.email
 * @param {IUser['phone_number']} args.phone_number
 * @returns {Promise<IUser['id']?>}
 */
async function findMatchingUser ({ user, email, phone_number }) {
  const byId = user ? (await User.get(user))?.id : null
  const byEmail = email ? (await User.getByEmail(email))?.id : null
  const byPhone = phone_number ? (await User.getByPhoneNumber(phone_number))?.id : null

  /** @type {(a: string | undefined?, b: string | undefined?) => boolean */
  const conflicts = (a, b) => Boolean(a && b && a !== b)

  if (conflicts(byId, byEmail) && conflicts(byEmail, byPhone)) {
    throw Error.Conflict('Proivded user, email and phone belong to three different users')
  } else if (conflicts(byId, byEmail)) {
    throw Error.Conflict('Provided user and email belong to different users')
  } else if (conflicts(byId, byPhone)) {
    throw Error.Conflict('Provided user and phone belong to different users')
  } else if (conflicts(byEmail, byPhone)) {
    throw Error.Conflict('Provided email and phone belong to different users')
  }

  return byId || byEmail || byPhone || null
}

/**
 * @typedef {object} AddMemberBody
 * @property {IUser['id']?} [user]
 * @property {IUser['email']?} [email]
 * @property {IUser['phone_number']?} [phone_number]
 * @property {IUser['first_name']?} [first_name]
 * @property {IUser['last_name']?} [last_name]
 */
/**
 * @param {IAuthenticatedRequest<{ id: IBrand['id'], role: string }, {}, {}>} req
 * @param {IResponse} res
 */
const addMember = async (req, res) => {
  if (!req.is('multipart/form-data')) {
    throw Error.NotAcceptable('Invalid content-type. multipart/form-data expected')
  }

  const { fields, files } = await AttachedFile.getRequestData({ req })
  let userId = await findMatchingUser(fields)

  if (!userId) {
    userId = await User.createShadow(fields)

    if (files.avatar) {
      const { file } = await AttachedFile.saveFromRequestFile(files.avatar, {
        public: true,
        path: userId,
        relations: [{ role: 'User', role_id: userId }],
        // XXX: saveFromRequestFile only needs the user.id
        user: { id: userId },
      })

      if (file?.url) {
        await patchUserAvatars(userId, 'Profile', file.url)
      }
    }
  }

  await BrandRole.addMember({ role: req.params.role, user: userId })
  return getMembers(req, res)
}

const getMembers = async (req, res) => {
  const ids = await BrandRole.getMembers(req.params.role)
  const members = await User.getAll(ids)
  res.collection(members)
}

const getAgents = async (req, res) => {
  /*
   * Access control on this endpoint is a bit different and handled here.
   * Basically, you have access to this endpoint if you normally have access to this brand.
   * The only difference is, if you are a member on this brand OR it's sub brands
   * you still should have access to this endpoint.
   * That's because you have to be able to choose another collueage of your's from a list
   * as a co-agent
   */

  const hasAccess = await Brand.isSubMember(req.params.id, req.user.id)

  if (!hasAccess)
    await Brand.limitAccess({
      user: req.user.id,
      brand: req.params.id
    })

  const agents = await Brand.getAgents(req.params.id)

  Orm.setAssociationConditions({
    'brand_role.members': agents.map(agent => agent.user)
  })

  const brand_ids = new Set(agents.map(a => a.brand))
  const brands = await Brand.getAll(Array.from(brand_ids))

  res.collection(brands)
}

const deleteMember = async (req, res) => {
  await BrandRole.removeMember(req.params.role, req.params.user)
  res.status(204)
  return res.end()
}

/**
 * @param {import('../../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, { user: UUID }>} req
 * @param {import('../../../types/monkey/controller').IResponse} res
 */
const inviteMember = async (req, res) => {
  await BrandUser.inviteMember(req.params.id, req.body.user)
  res.status(204)
  res.end()
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/roles/:role/members', b, access, am(addMember))
  app.get('/brands/:id/roles/:role/members', b, access, am(getMembers))
  app.delete('/brands/:id/roles/:role/members/:user', b, access, am(deleteMember))
  app.post('/brands/:id/invite', b, access, am(inviteMember))
  app.get('/brands/:id/agents', b, am(getAgents))
}

module.exports = router
