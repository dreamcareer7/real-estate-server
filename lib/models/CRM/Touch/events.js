const _ = require('lodash')

const {
  update_next_touch_for_list_members,
  update_touch_times_for_contact_associations,
  update_touch_times_for_contacts,
  update_touch_times_for_task,
  update_touch_times_for_tag,

  update_touch_times_for_google_threads,
  update_touch_times_for_microsoft_threads,
  update_touch_times_for_emails
} = require('./worker')

const Context = require('../../Context')
const Contact = require('../../Contact')
const ContactAttribute = require('../../Contact/attribute')
const EmailCampaign = require('../../Email/campaign')
const Tag = require('../../Contact/tag')
const ContactList = require('../../Contact/list')
const CrmAssociation = require('../Association')
const CrmTask = require('../Task')
const GoogleThread = require('../../Google/thread')
const MicrosoftThread = require('../../Microsoft/thread')

function updateContactNextTouch(contacts) {
  update_touch_times_for_contacts({ contacts })
}

/**
 * @typedef IDeletedAssociation
 * @property {UUID} crm_task
 * @property {UUID} created_by
 * @property {UUID=} contact
 * @property {UUID=} deal
 * @property {UUID=} listing
 * @property {UUID=} email
 */

/**
 * @param {IDeletedAssociation[]} associations
 */
function updateTouchTimesForDeletedContactAssociation(associations) {
  update_touch_times_for_contacts({ contacts: associations.filter(a => Boolean(a.contact)).map(a => a.contact) })
}

/**
 * @param {Array<{created_by: UUID; brand: UUID; id: UUID;}>} associations
 */
function updateTouchTimesForContactAssociation(associations) {
  update_touch_times_for_contact_associations({ associations })
}

function updateContactNextTouchForList(list_id) {
  update_next_touch_for_list_members({ list_id })
}

function updateContactTouchTimesForTask({ task_id, brand }) {
  update_touch_times_for_task({ task_id, brand })
}

function onTaskDelete({ task, brand_id }) {
  update_touch_times_for_contacts({ contacts: task.contacts, brand: brand_id })
  updateContactTouchTimesForTask({ task_id: task.id, brand: brand_id })
}

function onUpdateContactsBrand({ contact_ids, brand_id }) {
  update_touch_times_for_contacts({ contacts: contact_ids, brand: brand_id })
}

function onUpdateTag({ brand, tag }) {
  update_touch_times_for_tag({ tag, brand })
}

function onDeleteTag({ brand, contacts }) {
  update_touch_times_for_contacts({ contacts, brand })
}

function onGoogleThreadUpdated({ threads }) {
  update_touch_times_for_google_threads({ threads })
}

function onMicrosoftThreadUpdated({ threads }) {
  update_touch_times_for_microsoft_threads({ threads })
}

function onEmailSent({ emails, brand }) {
  update_touch_times_for_emails({
    emails,
    brand
  })
}

function onMergeContacts({ brand_id, contact_ids, event_type }) {
  if (event_type === 'merge') {
    update_touch_times_for_contacts({
      contacts: contact_ids,
      brand: brand_id
    })
  }
}

function onEmailAttributeManipulated({ attributes, brand }) {
  const contacts = _.uniq(attributes.map(a => a.contact))
  update_touch_times_for_contacts({ contacts, brand })
}

function logAndHandle(fn, msg) {
  return (...args) => {
    Context.log(msg)
    fn.apply(null, args)
  }
}

module.exports = function attachEventHandlers() {
  const l = logAndHandle

  ContactList.on('update', l(updateContactNextTouchForList, 'ContactList:update'))

  CrmAssociation.on('create', l(updateTouchTimesForContactAssociation, 'CrmAssociation:create'))
  CrmAssociation.on('delete', updateTouchTimesForDeletedContactAssociation)

  CrmTask.on('update:due_date', updateContactTouchTimesForTask)
  CrmTask.on('delete', onTaskDelete)

  Contact.on('update', onMergeContacts)
  Contact.on('update:brand', onUpdateContactsBrand)
  Contact.on('list:join', updateContactNextTouch)
  Contact.on('list:leave', updateContactNextTouch)

  GoogleThread.on('update', onGoogleThreadUpdated)
  MicrosoftThread.on('update', onMicrosoftThreadUpdated)
  EmailCampaign.on('sent', onEmailSent)
  ContactAttribute.on('create:email', onEmailAttributeManipulated)
  ContactAttribute.on('update:email', onEmailAttributeManipulated)
  ContactAttribute.on('delete:email', onEmailAttributeManipulated)

  Tag.on('update:touch_freq', onUpdateTag)
  Tag.on('delete', onDeleteTag)
}
