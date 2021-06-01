const _ = require('lodash')

const {
  update_next_touch_for_list_members,
  update_touch_times_for_contact_associations,
  update_touch_times_for_contacts,
  update_touch_times_for_tasks,
  update_touch_times_for_tag,

  update_touch_times_for_email_threads,
} = require('./worker')

const { update_touch_times_for_emails, update_touch_times_for_synced_messages } = require('./atomic')

const Context = require('../../Context')
const Contact = require('../../Contact/emitter')
const ContactAttribute = require('../../Contact/attribute/emitter')
const EmailCampaign = require('../../Email/campaign/emitter')
const Tag = require('../../Contact/tag')
const ContactList = require('../../Contact/list/emitter')
const CrmAssociation = require('../Association/emitter')
const CrmTask = require('../Task/emitter')
const EmailThread = require('../../Email/thread/emitter')
const GoogleMessage = require('../../Google/message/emitter')
const MicrosoftMessage = require('../../Microsoft/message/emitter')

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

function updateContactTouchTimesForTask({ task_ids, brand_id }) {
  update_touch_times_for_tasks({ task_ids, brand: brand_id })
}

function onTaskDelete({ task_ids, brand_id }) {
  update_touch_times_for_tasks({ task_ids, brand: brand_id })
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

function onEmailThreadPruned({ threads }) {
  update_touch_times_for_email_threads({ threads })
}

function onSyncedMessageUpdated({ threads, messages, ids, microsoft_credential, google_credential }) {
  const message_clusters = _.groupBy(messages, m => Math.floor(m.message_created_at / (5 * 60000)) * 5 * 60)
  Context.log(`Received ${messages.length} messages, in ${message_clusters.length} clusters`)

  for (const [timestamp, group] of Object.entries(message_clusters)) {
    update_touch_times_for_synced_messages({
      google_credential,
      microsoft_credential,
      recipients: _.uniq(group.flatMap(m => m.recipients)),
      timestamp: parseInt(timestamp) + 2.5 * 60
    })
  }
}

function onEmailSent({ emails, campaign, brand }) {
  update_touch_times_for_emails({
    emails,
    campaign,
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

  EmailThread.on('prune', onEmailThreadPruned)
  MicrosoftMessage.on('update', onSyncedMessageUpdated)
  GoogleMessage.on('update', onSyncedMessageUpdated)
  EmailCampaign.on('sent', onEmailSent)
  ContactAttribute.on('create:email', onEmailAttributeManipulated)
  ContactAttribute.on('update:email', onEmailAttributeManipulated)
  ContactAttribute.on('delete:email', onEmailAttributeManipulated)

  Tag.on('update:touch_freq', onUpdateTag)
  Tag.on('delete', onDeleteTag)
}
