const Activity = require('../../Activity/add')
const Context = require('../../Context')

const promisify = require('../../../utils/promisify')
const expect = require('../../../utils/validator').expect
const { peanar } = require('../../../utils/peanar')

const Brand = require('../../Brand/get')

const Contact = require('../index')
const { setActivityReference } = require('../activity')

const { sendFailureSocketEvent, sendSuccessSocketEvent } = require('./socket')
const utils = require('./import-utils')

const SOCKET_EVENT = 'contact:import'

/**
 * @param {IContactInput[]} contacts 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 * @this {import('peanar/dist/job').default}
 */
async function import_json(contacts, user_id, brand_id) {
  try {
    const total_contacts = await do_import_json(contacts, user_id, brand_id)
    utils.sendSlackSupportMessage(user_id, brand_id, total_contacts, 'iOS')
    sendSuccessSocketEvent(SOCKET_EVENT, this.id, user_id, total_contacts)
    return total_contacts
  }
  catch (ex) {
    sendFailureSocketEvent(SOCKET_EVENT, this.id, user_id, ex)
    throw ex
  }
}

/**
 * @param {IContactInput[]} contacts 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 */
async function do_import_json(contacts, user_id, brand_id) {
  expect(user_id).to.be.uuid
  expect(brand_id).to.be.uuid

  await Brand.get(brand_id)

  Context.log(`Job import json started for user ${user_id}`)

  const res = await Contact.create(contacts, user_id, brand_id, 'import_json', {
    activity: false,
    relax: true,
    get: false
  })

  utils.sendSlackSupportMessage(user_id, brand_id, res.length, 'iOS')

  const activity = await promisify(Activity.add)(user_id, 'User', {
    action: 'UserImportedContacts',
    object_class: 'ContactImportLog',
    object: {
      type: 'contact_import_log',
      import_type: 'ios',
      count: res.length,
      brand: brand_id
    }
  })

  await setActivityReference(res, activity.id)

  return res.length
}

module.exports = {
  import_json: peanar.job({
    handler: import_json,
    queue: 'contact_import',
    exchange: 'contacts',
    error_exchange: 'contacts_import.error'
  }),
}
