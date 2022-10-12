const { promisify } = require('util')
const { expect } = require('chai')

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

const TEST_TAG = 'TestTag'

async function createTagBasedContactList (brandId, userId, {
  tagName = TEST_TAG,
  name = `Having ${tagName}`,
  is_editable = true,
  touch_freq = 30,
} = {}) {
  const tagDefId = await findAttrDefId(brandId, 'tag')

  return ContactList.create(userId, brandId, {
    name,
    is_editable,
    touch_freq,
    filters: [{ attribute_def: tagDefId, value: tagName }],
  })
}

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
 * @param {object} to
 * @param {IContact['id'][]=} [to.include=[]]
 * @param {IContact['id'][]=} [to.notInclude=[]]
 */
async function checkMembership (listId, { include = [], notInclude = [] }) {
  await testHelper.handleJobs()

  const members = await ContactListMember.findByListId(listId)
  expect(members).to.be.an('array')

  const memContactIds = members.map(m => m.contact)

  if (include?.length) {
    expect(
      memContactIds,
      'the contact list does not include all of required contacts',
    ).to.include.all.members(include)
  }

  if (notInclude?.length) {
    expect(
      new Set(memContactIds),
      'the contact list includes one or more illegal contacts',
    ).to.not.have.any.keys(...notInclude)
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
  attrs = { tag: [TEST_TAG] },
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
      const listId = await createTagBasedContactList(assigneeBrand.id, assigneeId)
      const contactId = await createContact(adminBrand.id, adminId)

      await checkMembership(listId, { notInclude: [contactId] })

      // Admin: assigns the contact to the assignee
      await ContactRole.set(
        { contact: contactId, role: 'assignee', created_by: adminId },
        [{ brand: assigneeBrand.id, user: assigneeId }],
      )

      await checkMembership(listId, { include: [contactId] })

      // Admin: clears the contact tags
      await Contact.updateTags([contactId], [], adminId, adminBrand.id, true)

      await checkMembership(listId, { notInclude: [contactId] })
    })

    it('updates assignee\'s list membership records when admin unassignes the contact', async () => {
      const listId = await createTagBasedContactList(
        assigneeBrand.id,
        assigneeId,
      )

      const adminContactIds = {
        // will be assigned and remains assigned to both users:
        tagged1: await createContact(adminBrand.id, adminId),
        // will be assigned to both users, then the sib. user will be unassigned:
        tagged2: await createContact(adminBrand.id, adminId),
        // will be assigned to both users, then both users will be unassigned:
        tagged3: await createContact(adminBrand.id, adminId),
        // will be assigned to the main assignee user only:
        tagged4: await createContact(adminBrand.id, adminId),
        // will be assigned to the main assignee user only:
        nonTagged: await createContact(adminBrand.id, adminId, {}),
      }

      const assigContactIds = {
        tagged: await createContact(assigneeBrand.id, assigneeId),
        nonTagged: await createContact(assigneeBrand.id, assigneeId, {}),
      }

      const assigSibContactIds = {
        tagged: await createContact(assigneeBrand.id, assigneeSibId),
        nonTagged: await createContact(assigneeBrand.id, assigneeSibId, {}),
      }

      await checkMembership(listId, {
        include: [
          assigContactIds.tagged,
          assigSibContactIds.tagged
        ],
        notInclude: [
          adminContactIds.tagged1,
          adminContactIds.tagged2,
          adminContactIds.tagged3,
          adminContactIds.tagged4,
          adminContactIds.nonTagged,
          assigContactIds.nonTagged,
          assigSibContactIds.nonTagged,
        ],
      })

      const common = { role: 'assignee', created_by: adminId }
      const role = { brand: assigneeBrand.id, user: assigneeId }
      const sibRole = { brand: assigneeBrand.id, user: assigneeSibId }

      await ContactRole.set(
        { ...common, contact: adminContactIds.tagged1 },
        [role /* (permanent) */, sibRole /* (permanent) */],
      )
      await ContactRole.set(
        { ...common, contact: adminContactIds.tagged2 },
        [role /* (permanent) */, sibRole /* (temporary) */],
      )
      await ContactRole.set(
        { ...common, contact: adminContactIds.tagged3 },
        [role /* (temporary) */, sibRole /* (temporary) */],
      )
      await ContactRole.set(
        { ...common, contact: adminContactIds.tagged4 },
        [role /* (permanent) */],
      )
      await ContactRole.set(
        { ...common, contact: adminContactIds.nonTagged },
        [role /* (permanent) */],
      )

      await checkMembership(listId, {
        include: [
          adminContactIds.tagged1,
          adminContactIds.tagged2,
          adminContactIds.tagged3,
          adminContactIds.tagged4,
          assigContactIds.tagged,
          assigSibContactIds.tagged,
        ],
        notInclude: [
          adminContactIds.nonTagged,
          assigContactIds.nonTagged,
          assigSibContactIds.nonTagged,
        ],
      })

      const sibListId = await createTagBasedContactList(
        assigneeBrand.id,
        assigneeSibId,
      )

      await checkMembership(sibListId, {
        include: [
          adminContactIds.tagged1,
          adminContactIds.tagged2,
          adminContactIds.tagged3,
          assigContactIds.tagged,
          assigSibContactIds.tagged,
        ],
        notInclude: [
          adminContactIds.tagged4,
          adminContactIds.nonTagged,
          assigContactIds.nonTagged,
          assigSibContactIds.nonTagged,
        ],
      })

      await ContactRole
        .set({ ...common, contact: adminContactIds.tagged2 }, [role])
      await ContactRole
        .set({ ...common, contact: adminContactIds.tagged3 }, [])

      await checkMembership(listId, {
        include: [
          adminContactIds.tagged1,
          adminContactIds.tagged2,
          adminContactIds.tagged4,
          assigContactIds.tagged,
          assigSibContactIds.tagged,
        ],
        notInclude: [
          adminContactIds.tagged3,
          adminContactIds.nonTagged,
          assigContactIds.nonTagged,
          assigSibContactIds.nonTagged,
        ],
      })

      await checkMembership(sibListId, {
        include: [
          adminContactIds.tagged1,
          assigContactIds.tagged,
          assigSibContactIds.tagged,
        ],
        notInclude: [
          adminContactIds.tagged2,
          adminContactIds.tagged3,
          adminContactIds.tagged4,
          assigContactIds.nonTagged,
          assigSibContactIds.nonTagged,
        ],
      })
    })
  })

  context('Filter', () => {
    it('returns assigned contacts, as well as owned ones', async () => {
      const indie = await setupIndependentUser()

      const adminContactId = await createContact(adminBrand.id, adminId)
      const adminContactId2 = await createContact(adminBrand.id, adminId)
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
        [...as.admin, null, [adminContactId, adminContactId2]],
        [...as.admin, [adminId, adminSibId], [adminContactId, adminContactId2]],
        [...as.admin, [adminSibId], []],
        [...as.admin, [assigneeId], []],
        [...as.adminSib, null, [adminContactId, adminContactId2]],
        [...as.adminSib, [adminId], [adminContactId, adminContactId2]],
        [...as.adminSib, [adminSibId], [adminContactId, adminContactId2]],
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
