const map = require('lodash/map')

const { expect } = require('../../utils/validator')
const Brand = {
  ...require('../../models/Brand/get'),
  ...require('../../models/Brand/access'),
}
const ContactRole = require('../../models/Contact/role/manipulate')
const Contact = require('../../models/Contact/get')
const { limitAccess } = require('./common')

/**
 * @template TParams
 * @template TQuery
 * @template TBody
 * @typedef {import('../../../types/monkey/controller').IAuthenticatedRequest<TParams, TQuery, TBody>} IAuthenticatedRequest
 */
/** @typedef {import('../../../types/monkey/controller').IResponse} IResponse */

/** @param {any[]} ids */
function ensureIds (ids) {
  for (const id of ids) {
    expect(id).to.be.uuid
  }
}

/** @returns {IBrand['id']} */
function getCurrentBrand () {
  const brand = Brand.getCurrent()
  if (!brand?.id) { throw Error.BadRequest('Brand is not specified.') }

  return brand.id
}

/**
 * @param {IBrand['id']} parentBrandId
 * @param {IBrand['id'][]} brandIds
 */
async function ensureParentBrand (parentBrandId, brandIds) {
  if (!brandIds.length) { return }

  for (const bid of [...new Set(brandIds)]) {
    const parentIds = await Brand.getParents(bid)

    if (!parentIds.includes(parentBrandId)) {
      throw Error.BadRequest(`Brand ${parentBrandId} is not parent of brand ${bid}`)
    }
  }
}

/**
 * @param {IAuthenticatedRequest<{ id: IContact['id'] }, {}, { assignees: Pick<IContactRole, 'user' | 'brand'>[] }} req
 * @param {IResponse} res
 */
async function setAssignees (req, res) {
  const contact = req.params.id
  const assignees = req.body.assignees

  const currBrand = getCurrentBrand()
  const currUser = req.user.id

  ensureIds(map(assignees, 'brand'))
  ensureIds(map(assignees, 'user'))

  await limitAccess('write', currUser, currBrand, [contact])
  await ensureParentBrand(currBrand, map(assignees, 'brand'))

  await ContactRole.set({
    contact,
    role: 'assignee',
    created_by: currUser,
  }, assignees)

  res.model(await Contact.get(contact))
}

module.exports = {
  setAssignees,
}
