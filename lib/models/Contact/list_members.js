const { EventEmitter } = require('events')
const _ = require('lodash')

const squel = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

const Contact = require('./index')
const ContactList = require('./list')

const TABLE = 'contact_lists_members'

class ListMemberClass extends EventEmitter {
  /**
   * Get members of multiple lists
   * @param {UUID[]} list_ids 
   * @returns {Promise<Record<UUID, IContactListMember[]>>}
   */
  async getForLists(list_ids) {
    const result = await db.select('contact/list_member/get', [list_ids])
    return _.groupBy(result, 'list')
  }

  /**
   * Get membership records for a list
   * @param {UUID} list_id List id
   * @returns {Promise<IContactListMember[]>}
   */
  async getForList(list_id) {
    const members_by_list = await this.getForLists([list_id])
    return members_by_list[list_id] || []
  }

  addOne(list_id, contact_id, is_manual) {
    return this.add([{
      list: list_id,
      contact: contact_id,
      is_manual: is_manual
    }])
  }

  /**
   * 
   * @param {IContactListMember[]} membership_records membership records to add
   * @returns 
   */
  async add(membership_records) {
    if (_.isEmpty(membership_records)) return

    const q = squel.insert()
      .into(TABLE)

    if (Array.isArray(membership_records)) {
      q.setFieldsRows(membership_records)
    } else {
      q.fromQuery(['list', 'contact', 'is_manual'], membership_records)
    }

    q.onConflict(['list', 'contact'], {
      deleted_at: null,
      is_manual: squel.case()
        .when('contact_lists_members.deleted_at IS NULL')
        .then(squel.expr().and('contact_lists_members.is_manual').or('EXCLUDED.is_manual'))
        .else(squel.expr().and('EXCLUDED.is_manual'))
    })

    q.name = 'contact/list_member/add'

    return db.query.promise(q, [])
  }

  /**
   * Remove membership records for contacts that are actually deleted
   * @param {UUID[]} contact_ids Deleted contact ids
   */
  async deleteForContacts(contact_ids) {
    if (contact_ids.length < 1) return

    return db.update('contact/list_member/delete_contact', [
      contact_ids
    ])
  }

  /**
   * Removes a number of membership records, and preserves auto-matched contacts
   * @param {IContactListMember[]} membership_records membership records to be removed
   * @returns {Promise<void>}
   */
  async remove(membership_records) {
    if (_.isEmpty(membership_records)) return

    const q = squel
      .update()
      .withValues('update_values', membership_records.map(mr => _.pick(mr, ['list', 'contact', 'is_manual'])))
      .table(TABLE, 'clm')
      .set('deleted_at = now()')
      .from('update_values', 'uv')
      .where('clm.list = uv.list::uuid')
      .where('clm.contact = uv.contact::uuid')
      .where('clm.is_manual = uv.is_manual::boolean')
      .returning('clm.list, clm.contact, clm.is_manual')

    q.name = 'contact/list_member/remove'

    /** @type {IContactListMember[]} */
    const removed = await db.select(q, [])

    // If some of the removed contacts were added manually, they may still
    // match some of the lists, so we'll need to add them back.
    const removed_manuals = removed.filter(r => r.is_manual === true)

    if (removed_manuals.length < 1) return

    const removed_manuals_by_list = _.groupBy(removed_manuals, 'list')
    const lists = await ContactList.getAll(Object.keys(removed_manuals_by_list))
    let to_add = []

    for (const list of lists) {
      const [members, ] = await this.selectMatchingContactsForList(list, removed_manuals_by_list[list.id].map(mr => mr.contact))
      to_add = to_add.concat(members)
    }

    await this.add(to_add)
  }

  /**
   * Worker function. Updates membership cache of lists
   * @param {UUID[]} contact_ids 
   */
  async updateContactMemberships(contact_ids) {
    // The assumption here is that all of the users can access all contact_ids
    const users = await Contact.authorizedUsers(contact_ids)
    const list_ids = await ContactList.getForUsers(users)
    const lists = await ContactList.getAll(list_ids)

    /** @type {IContactListMember[]} */
    let to_add = []
    /** @type {IContactListMember[]} */
    let to_remove = []

    for (const l of lists) {
      const [members, non_members] = await this.selectMatchingContactsForList(l, contact_ids)

      to_add = to_add.concat(members)
      to_remove = to_remove.concat(non_members)
    }

    await this.add(to_add)
    await this.remove(to_remove)
  }

  /**
   * Partitions contact_ids by their matching status to list.filters
   * @private
   * @param {IContactList} list 
   * @param {UUID[]=} contact_ids 
   * @returns {Promise<Array<IContactListMember[]>>}
   */
  async selectMatchingContactsForList(list, contact_ids) {
    const options = {}

    if (contact_ids)
      options.ids = contact_ids

    if (list.query) {
      options.q = list.query.split(/\s+/)
    }

    const res = await Contact.filter(list.user, list.filters, options)
    const matching_ids = Array.from(res.ids)
    const non_members = _.difference(contact_ids, matching_ids)

    return [matching_ids, non_members].map(ids => ids.map(id => ({
      list: list.id,
      contact: id,
      is_manual: false
    })))
  }

  /**
   * Updates membership records of a list
   * @param {UUID} list_id List id
   * @returns {Promise<void>}
   */
  async updateListMemberships(list_id) {
    const list = await ContactList.get(list_id)

    if (!list) return

    const current_members = await this.getForList(list_id)
    const [actual_members, ] = await this.selectMatchingContactsForList(list)

    const to_add = _.differenceBy(actual_members, current_members, 'contact')
    const to_remove = _(current_members)
      .filter(mr => mr.is_manual === false)
      .differenceBy(actual_members, 'contact')
      .value()

    await this.add(to_add)
    await this.remove(to_remove)
  }
}

module.exports = new ListMemberClass()