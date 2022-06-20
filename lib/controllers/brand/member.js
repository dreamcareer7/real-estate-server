const _ = require('lodash')
const promisify = require('../../utils/promisify')

const Brand = require('../../models/Brand/index')
const BrandRole = require('../../models/Brand/role/members')
const BrandUser = require('../../models/Brand/user/invite')
const Orm = require('../../models/Orm/context')
const User = {
  ...require('../../models/User/get'),
  ...require('../../models/User/create'),
}

const addMember = async (req, res) => {
  const users = req.body.users || []
  const emails = req.body.emails || []
  const phone_numbers = req.body.phone_numbers || []

  if (_.isEmpty(users) && _.isEmpty(emails) && _.isEmpty(phone_numbers))
    return res.error(Error.Validation('You must supply either an array of user ids, emails or phone numbers'))

  if (!Array.isArray(users))
    return res.error(Error.Validation('`user` property must be an array of user ids'))

  if (!Array.isArray(emails))
    return res.error(Error.Validation('`emails` property must be an array of email addresses'))

  if (!Array.isArray(phone_numbers))
    return res.error(Error.Validation('`phone_numbers` property must be an array of phone numbers'))


  const saved = await promisify(User.getOrCreateBulk)(req.user.id, users, emails, phone_numbers)

  for(const user of saved) {
    await BrandRole.addMember({
      role: req.params.role,
      user
    })
  }

  const ids = await BrandRole.getMembers(req.params.role)
  const members = await User.getAll(ids)
  res.collection(members)
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
