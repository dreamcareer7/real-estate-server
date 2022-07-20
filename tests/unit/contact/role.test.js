const { promisify } = require('util')
const { expect } = require('chai')

const some = require('lodash/some')

const User = require('../../../lib/models/User/create')
const ContactRole = require('../../../lib/models/Contact/role/manipulate')
const AttributeDef = require('../../../lib/models/Contact/attribute_def/get')
const ContactList = require('../../../lib/models/Contact/list/manipulate')
const ContactListMember = require('../../../lib/models/Contact/list/members')
const Contact = {
  ...require('../../../lib/models/Contact/fast_filter'),
  ...require('../../../lib/models/Contact/manipulate'),
}

const contactHelper = require('../contact/helper')
const brandHelper = require('../brand/helper')
const testHelper = require('../helper')

const createUserPromise = promisify(User.create)

/** @returns {Promise<{ userId: IUser['id'], brandId: IBrand['id'] }>} */
async function setupIndependentUser () {
  const userId = await createUser('Indie', 'Indie', 'indie@rechat.co')
  const brand = await brandHelper.create({
    roles: { Admin: [userId] },
  })

  return { userId, brandId: brand.id }
}

/**
 * @param {IContactList['id']} listId
 * @param {IContact['id']} contactId
 * @param {boolean=} [toBeIncluded=true]
 */
async function checkMembership (listId, contactId, toBeIncluded = true) {
  await testHelper.handleJobs()

  const members = await ContactListMember.findByListId(listId)
  const found = some(members, { contact: contactId })

  expect(members).to.be.an('array')

  if (toBeIncluded) {
    expect(found, 'The contact list does not contain the contact')
  } else {
    expect(!found, 'The contact list contains the contact')
  }
}

/**
 * @param {IBrand['id']} brandId
 * @param {string} defName
 * @returns {Promise<IContactAttributeDef['id']>}
 */
async function findAttrDefId (brandId, name) {
  const defsByName = await AttributeDef.getDefsByName(brandId)
  const defId = defsByName.get(name)

  expect(defId, `No such attribute def: ${name}`).to.be.uuid
  return defId
}

/**
 * @param {string} first_name
 * @param {string} last_name
 * @returns {Promise<IUser['id']>}
 */
async function createUser (first_name, last_name, email) {
  const id = await createUserPromise({ first_name, last_name, email })
  return id ?? expect.fail('Impossible State')
}

/**
 * @param {IBrand['id']} brandId
 * @param {IUser['id']} userId
 * @param {IContactAttributeInput[]} [attrs]
 * @returns {Promise<IContact['id']>}
 */
async function createContact (
  brandId,
  userId,
  attrs = { tag: ['TempTag'] },
) {
  const [contactId] = await Contact.create([{
    user: userId,
    attributes: contactHelper.attributes(attrs),
  }], userId, brandId)

  return contactId
}

describe('Contact', () => {
  testHelper.createContext()

  /** @type {IUser['id']} */
  let adminId

  /** @type {IUser['id']} */
  let adminSibId

  /** @type {IUser['id']} */
  let assigneeId

  /** @type {IUser['id']} */
  let assigneeSibId

  /** @type {IBrand} */
  let adminBrand

  /** @type {IBrand} */
  let assigneeBrand

  beforeEach(async function setup () {
    adminId = await createUser('Admin', 'A', 'admin@rechat.co')
    adminSibId = await createUser('Admin', 'Sib', 'adminsib@rechat.co')
    adminBrand = await brandHelper.create({
      roles: { Admin: [adminId, adminSibId] },
    })

    assigneeId = await createUser('Assignee', 'A', 'assignee@rechat.co')
    assigneeSibId = await createUser('Assignee', 'Sib', 'assigneesib@rechat.co')
    assigneeBrand = await brandHelper.create({
      roles: { Admin: [assigneeId, assigneeSibId] },
      parent: adminBrand.id,
      checklists: [],
      contexts: [],
      templates: [],
    })

    await testHelper.handleJobs()
  })

  context('Role', () => {
    it('updates assignee\'s list membership records when admin changes tags', async () => {
      const tagDefId = await findAttrDefId(assigneeBrand.id, 'tag')

      const listId = await ContactList.create(assigneeId, assigneeBrand.id, {
        name: 'HavingTempBrand',
        is_editable: true,
        touch_freq: 30,
        filters: [{ attribute_def: tagDefId, value: 'TempTag' }]
      })

      const contactId = await createContact(adminBrand.id, adminId)

      await checkMembership(listId, contactId, false)

      // Admin: assigns the contact to the assignee
      await ContactRole.set(
        { contact: contactId, role: 'assignee', created_by: adminId },
        [{ brand: assigneeBrand.id, user: assigneeId }],
      )

      await checkMembership(listId, contactId, true)

      // Admin: clears the contact tags
      await Contact.updateTags([contactId], [], adminId, adminBrand.id)

      await checkMembership(listId, contactId, false)
    })
  })

  context('Filter', () => {
    it('returns assigned contacts, as well as owned ones', async () => {
      const indie = await setupIndependentUser()

      const adminContactId = await createContact(adminBrand.id, adminId)
      const assigneeContactId = await createContact(assigneeBrand.id, assigneeId)

      // Admin: assigns the contact to the assignee
      await ContactRole.set(
        { contact: adminContactId, role: 'assignee', created_by: adminId },
        [{ brand: assigneeBrand.id, user: assigneeId }],
      )

      await testHelper.handleJobs()

      /** @type {Record<string, [UUID, UUId]>} */
      const as = {
        indie: [indie.brandId, indie.userId],
        admin: [adminBrand.id, adminId],
        assig: [assigneeBrand.id, assigneeId],
        adminSib: [adminBrand.id, adminSibId],
        assigSib: [assigneeBrand.id, assigneeSibId],
      }

      /** @type {[UUID, UUID, UUID[] | null, UUID[]][]} */
      const testCalls = [
        // [brandId, userId, usersOption, expectedResult]
        [...as.admin, null, [adminContactId]],
        [...as.admin, [adminId, adminSibId], [adminContactId]],
        [...as.admin, [adminSibId], []],
        [...as.admin, [assigneeId], []],
        [...as.adminSib, null, [adminContactId]],
        [...as.adminSib, [adminId], [adminContactId]],
        [...as.adminSib, [adminSibId], [adminContactId]],
        [...as.assig, null, [assigneeContactId, adminContactId]],
        [...as.assig, [assigneeId], [assigneeContactId, adminContactId]],
        [...as.assig, [assigneeSibId], []],
        [...as.assig, [adminId], []],
        [...as.assigSib, null, [assigneeContactId]],
        [...as.assigSib, [assigneeSibId], [assigneeContactId]],
        [...as.assigSib, [assigneeId], [assigneeContactId]],
        [...as.assigSib, [adminId], []],
        [...as.indie, null, []],
        [...as.indie, [adminId, adminSibId, assigneeId, assigneeSibId], []],
      ]

      for (const [i, [bid, uid, users, exp]] of testCalls.entries()) {
        const res = await Contact.fastFilter(bid, uid, [], { users })

        expect(res, `test call failed. Check testCalls[${i}] in the test file.`)
          .to.have.property('ids')
          .which.is.an('array')
          .with.lengthOf(exp.length)
          .and.has.same.members(exp)
      }
    })
  })
})
