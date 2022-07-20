const { EventEmitter } = require('events')
const _ = require('lodash')

const squel = require('../../../utils/squel_extensions')
const db = require('../../../utils/db.js')

const Contact = require('../index')
const ContactList = require('../list/get')

const TABLE = 'crm_lists_members'

class ListMemberClass extends EventEmitter {
  /**
   * Get members of multiple lists
   * @param {UUID[]} list_ids 
   * @returns {Promise<IContactListMember[]>}
   */
  findByListIds(list_ids) {
    return db.select('contact/list_member/get', [list_ids])
  }

  /**
   * 
   * @param {Record<'list' | 'contact', UUID>[]} pairs contact-list pairs
   */
  findNonMembers(pairs) {
    const q = squel.select()
      .withValues('pairs', pairs.map(mr => _.pick(mr, ['list', 'contact'])))
      .field('pairs.contact')
      .field('pairs.list')
      .from('pairs')
      .left_join(TABLE, 'clm', 'clm.contact = pairs.contact::uuid AND clm.list = pairs.list::uuid')
      .where('deleted_at IS NULL')
      .where('is_manual IS NULL')

    return db.select(q, [])
  }

  /**
   * Get membership records for a list
   * @param {UUID} list_id List id
   * @returns {Promise<IContactListMember[]>}
   */
  async findByListId(list_id) {
    const membership_records = await this.findByListIds([list_id])
    return membership_records.filter(mr => mr.list === list_id)
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
   */
  async add(membership_records) {
    if (_.isEmpty(membership_records)) return

    const non_members = await this.findNonMembers(membership_records)

    await db.chunked(membership_records, 3, (chunk, i) => {
      const q = squel
        .insert()
        .into(TABLE)
        .setFieldsRows(chunk)
        .onConflict(['list', 'contact'], {
          deleted_at: null,
          is_manual: squel.case()
            .when(`${TABLE}.deleted_at IS NULL`)
            .then(squel.expr().and(`${TABLE}.is_manual`).or('EXCLUDED.is_manual'))
            .else(squel.expr().and('EXCLUDED.is_manual'))
        })

      q.name = 'contact/list_member/add#' + i
      return db.selectIds(q)
    })

    const affected_contacts = _.uniq(non_members.map(mr => mr.contact))
    Contact.emit('list:join', affected_contacts)

    this.emit('member:add', non_members)
  }

  /**
   * Remove membership records for contacts that are actually deleted
   * @param {UUID[]} contact_ids Deleted contact ids
   */
  async deleteByContactIds(contact_ids) {
    if (contact_ids.length < 1) return

    const affected_lists = await db.selectIds('contact/list_member/find_by_contact_ids', [contact_ids])

    await db.update('contact/list_member/delete_contact', [
      contact_ids
    ])

    this.emit('member:remove', affected_lists)
  }

  /**
   * Remove membership records for a list that's actually deleted
   * @param {UUID[]} list_ids Deleted list id
   */
  async deleteByListIds(list_ids) {
    if (!list_ids)
      throw Error('No list_id passed to ListMember.deletedByListId')

    const affected_contacts = await db.selectIds('contact/list_member/find_by_list_id', [list_ids])

    await db.update('contact/list_member/delete_list', [
      list_ids
    ])

    Contact.emit('list:leave', _.uniq(affected_contacts))
  }

  /**
   * Removes a number of membership records, and preserves auto-matched contacts
   * @param {IContactListMember[]} membership_records membership records to be removed
   * @returns {Promise<void>}
   */
  async remove(membership_records) {
    if (_.isEmpty(membership_records)) return

    // If some of the removed contacts were added manually, they may still
    // match some of the lists, so we'll need to mark them as not manuals anymore.
    const manuals = membership_records.filter(r => r.is_manual === true)

    /** @type {IContactListMember[]} */
    let to_skip = []

    if (manuals.length > 0) {
      const removed_manuals_by_list = _.groupBy(manuals, 'list')
      const lists = await ContactList.getAll(Object.keys(removed_manuals_by_list))

      for (const list of lists) {
        const [members, ] = await this.selectMatchingContactsForList(list, removed_manuals_by_list[list.id].map(mr => mr.contact))
        to_skip = to_skip.concat(members)
      }

      await db.chunked(to_skip.map(mr => _.pick(mr, ['list', 'contact'])), 2, (chunk, i) => {
        const q_update = squel
          .update()
          .withValues('update_values', chunk)
          .table(TABLE, 'clm')
          .set('is_manual = FALSE')
          .from('update_values', 'uv')
          .where('clm.list = uv.list::uuid')
          .where('clm.contact = uv.contact::uuid')

        return db.update(q_update, [])
      })
    }

    const to_remove = membership_records
      .filter(mr => !_.find(to_skip, _.pick(mr, ['list', 'contact'])))
      .map(mr => _.pick(mr, ['list', 'contact', 'is_manual']))

    /** @type {IContactListMember[]} */
    const removed = await db.chunked(to_remove, 3, (chunk, i) => {
      const q = squel
        .update()
        .withValues('update_values', chunk)
        .table(TABLE, 'clm')
        .set('deleted_at = now()')
        .from('update_values', 'uv')
        .where('clm.list = uv.list::uuid')
        .where('clm.contact = uv.contact::uuid')
        .where('clm.is_manual = uv.is_manual::boolean')
        .returning('clm.list, clm.contact, clm.is_manual')

      q.name = 'contact/list_member/remove'
      return db.select(q, [])
    })

    const affected_contacts = _.uniq(removed.map(mr => mr.contact))
    Contact.emit('list:leave', affected_contacts)

    const affected_lists = _.uniq(removed.map(mr => mr.list))
    this.emit('member:remove', affected_lists)
  }

  /**
   * Worker function. Updates membership cache of lists
   * @param {UUID[]} contact_ids 
   * @param {UUID[]=} removed_brands brands from which contact_ids have been 
   *  removed/unauthorized. This is mainly used for unassigning a contact from
   *  a user-brand.
   */
  async updateContactMemberships(contact_ids, removed_brands = undefined) {
    // The assumption here is that all of the users can access all contact_ids
    const brands = await Contact.authorizedBrands(contact_ids)
    const list_ids = await ContactList.getForBrands(brands)
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

    // Clean up membership records for lists of brands where the contacts are no
    // longer accessible.
    if (Array.isArray(removed_brands) && removed_brands.length > 0) {
      const list_ids = await ContactList.getForBrands(removed_brands)
      for (const list of list_ids) {
        to_remove = to_remove.concat(contact_ids.map(contact => ({
          is_manual: false,
          contact,
          list
        })))
      }
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
    /** @type {IContactFilterOptions} */
    const options = list.args || {}

    if (contact_ids)
      options.ids = contact_ids

    if (list.query) {
      options.q = list.query.split(/\s+/)
    }

    const res = await Contact.fastFilter(list.brand, list.created_by, list.filters, options)
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

    if (list && list.deleted_at) {
      return this.deleteByListIds([list.id])
    }

    if (!list) return

    const current_members = await this.findByListId(list_id)
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
