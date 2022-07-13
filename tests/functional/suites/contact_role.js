const find = require('lodash/find')
const get = require('lodash/get')
const { deepFreeze } = require('../../../lib/utils/belt')
const {
  resolve,
  createUser,
  getTokenFor,
  createBrands,
  switchBrand,
  runAsUser,
  runAsUauthorized,
} = require('../util')

const data = (function () {
  const emails = {
    admin: 'brand+admin@rechat.co',
    firstAssignee: 'first+assignee@rechat.co',
    secondAssignee: 'second+assignee@rechat.co',
    thirdAssignee: 'third+assignee@rechat.co',
  }

  return deepFreeze({
    emails,

    brands: {
      name: 'Admin Brand Parent',
      brand_type: 'Office',
      roles: { Admin: [emails.admin] },

      children: [{
        name: 'First Child Brand',
        brand_type: 'Team',
        roles: {
          Assignee: {
            members: [emails.firstAssignee, emails.secondAssignee],
            acl: [],
          },
        },
      }, {
        name: 'Second Child Brand',
        brand_type: 'Team',
        roles: {
          Assignee: {
            members: [emails.thirdAssignee],
            acl: [],
          },
        },
      }],
    },

    contact: {
      attributes: [{ attribute_type: 'email', text: 'the.lead@rechat.co' }],
    },

    newAttributes: [{ attribute_type: 'tag', text: 'FooTag' }],
  })
})()

const R = path => get(results.contact_role, path)
const the = {
  adminBrandId: () => R('brands.data.0.id'),
  firstChildBrandId: () => R('brands.data.0.children.0.id'),
  secondChildBrandId: () => R('brands.data.0.children.1.id'),

  adminId: () => R('admin.data.id'),
  firstAssigneeId: () => R('firstAssignee.data.id'),
  secondAssigneeId: () => R('secondAssignee.data.id'),

  contactId: () => R('createContact.data.0'),
  addedAttr: attr => () => find(R('addAttributes.data'), attr),
}

/**
 * @param {any} contact
 * @param {UUID | () => UUID} userId
 * @param {string} [name]
 */
function createContact (contact, userId, name = 'create a contact') {
  return cb => frisby
    .create(name)
    .post('/contacts', {
      contacts: [{
        user: resolve(userId),
        ...contact,
      }]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 1)
}

/**
 * @param {UUID | () => UUID} contactId
 * @param {UUID | () => UUID} brandId
 * @param {UUID | () => UUID} userId
 * @param {string} [name]
 */
function assignContact (contactId, brandId, userId, name = '(re)assign the contact') {
  return cb => frisby
    .create(name)
    .put(`/contacts/${resolve(contactId)}/assignees`, {
      assignees: [{
        brand: resolve(brandId),
        user: resolve(userId),
      }]
    })
    .after(cb)
    .expectStatus(204)
}

/**
 * @param {UUID | () => UUID} contactId
 * @param {UUID | () => UUID} expectedBrandId
 * @param {UUID | () => UUID} expectedUserId
 * @param {string} [name]
 */
function checkAssignee (
  contactId,
  expectedBrandId,
  expectedUserId,
  name = 'check contact assignees',
) {
  return cb => frisby
    .create(name)
    .get(`/contacts/${resolve(contactId)}?associations[]=contact.assignees&associations[]=contact_role.brand&associations[]=contact_role.user`)
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data.assignees', 1)
    .expectJSON({
      data: {
        id: resolve(contactId),
        type: 'contact',
        assignees: [{
          type: 'contact_role',
          brand: {
            type: 'brand',
            id: resolve(expectedBrandId),
          },
          user: {
            type: 'user',
            id: resolve(expectedUserId)
          },
        }]
      }
    })
}

/**
 * @param {UUID | () => UUID} contactId
 * @param {Partial<IContactAttribute>[]} attributes
 * @param {string} [name]
 */
function addAttributes (
  contactId,
  attributes,
  name = `add ${attributes.length} attribute(s)`,
) {
  return cb => frisby
    .create(name)
    .post(`/contacts/${resolve(contactId)}/attributes`, { attributes })
    .after(cb)
    .expectStatus(200)
}

/**
 * @param {UUID | () => UUID} contactId
 * @param {{ id: UUID } | () => { id: UUID }} attr
 * @param {string} [name]
 */
function deleteAttribute (
  contactId,
  attr,
  name = 'delete a contact attribute',
) {
  return cb => frisby
    .create(name)
    .delete(`/contacts/${resolve(contactId)}/attributes/${resolve(attr).id}`)
    .after(cb)
    .expectStatus(200)
}

/**
 * @param {UUID | () => UUID} contactId
 * @param {number} [expectedStatus]
 * @param {string} [name]
 */
function deleteContact (
  contactId,
  expectedStatus = 204,
  name = `delete the contact (expected status: ${expectedStatus})`,
) {
  return cb => frisby
    .create(name)
    .delete(`/contacts/${resolve(contactId)}`)
    .after(cb)
    .expectStatus(expectedStatus)
}

/**
 * @param {UUID | () => UUID} contactId
 * @param {number} [expectedStatus]
 * @param {string} [name]
 */
function accessContact (
  contactId,
  expectedStatus = 200,
  name = `access the contact (exptected status: ${expectedStatus})`,
) {
  return cb => frisby
    .create(name)
    .get(`/contacts/${resolve(contactId)}`)
    .after(cb)
    .expectStatus(expectedStatus)
}

module.exports = {
  admin: createUser({ email: data.emails.admin }),
  firstAssignee: createUser({ email: data.emails.firstAssignee }),
  secondAssignee: createUser({ email: data.emails.secondAssignee }),
  thirdAssignee: createUser({ email: data.emails.thirdAssignee }),

  adminAuth: getTokenFor(data.emails.admin),
  firstAssigneeAuth: getTokenFor(data.emails.firstAssignee),
  secondAssigneeAuth: getTokenFor(data.emails.secondAssignee),
  thirdAssigneeAuth: getTokenFor(data.emails.thirdAssignee),

  brands: createBrands('create contact role brands', [data.brands]),

  ...switchBrand(the.adminBrandId, runAsUser(data.emails.admin, {
    createContact: createContact(data.contact, the.adminId),
    fakeAssign: assignContact(the.contactId, the.firstChildBrandId, the.secondAssigneeId),
    assign: assignContact(the.contactId, the.firstChildBrandId, the.firstAssigneeId),
    checkAssigneeAsAdmin: checkAssignee(
      the.contactId,
      the.firstChildBrandId,
      the.firstAssigneeId,
      'check the contact assignee (as admin)',
    ),
  })),

  ...switchBrand(the.firstChildBrandId, runAsUser(data.emails.firstAssignee, {
    checkAssignee: checkAssignee(
      the.contactId,
      the.firstChildBrandId,
      the.firstAssigneeId,
      'check the contact assignee (as assignee)',
    ),
    addAttributes: addAttributes(the.contactId, data.newAttributes),
    deleteAttribute: deleteAttribute(
      the.contactId,
      the.addedAttr(data.newAttributes[0]),
    ),
    tryToDelete: deleteContact(the.contactId, 404),
  })),

  ...switchBrand(the.firstChildBrandId, runAsUser(data.emails.secondAssignee, {
    tryToAccess1: accessContact(
      the.contactId,
      404,
      'access the contact from different user in the same brand (expected status: 404)',
    ),
  })),

  ...switchBrand(the.secondChildBrandId, runAsUser(data.emails.thirdAssignee, {
    tryToAccess2: accessContact(
      the.contactId,
      404,
      'access the contact from different user in different brand (expected status: 404)',
    ),
  })),

  ...switchBrand(the.adminBrandId, runAsUser(data.emails.admin, {
    deleteContact: deleteContact(
      the.contactId,
      204,
      'delete the contact as admin',
    ),
  })),
}
