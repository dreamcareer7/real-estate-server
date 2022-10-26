const _ = require('lodash')
const Contact = require('../emitter')
const Attribute = {
  ...require('./get'),
  ...require('./manipulate'),
}
const belt = require('../../../utils/belt')

/** @type {(str: string) => string} trims too! */
const lower = str => String(str).toLowerCase().trim()

/**
 * @param {string[] | null | undefined} array
 * @param {string} str
 */
function includesWithDifferentCase (array, str) {
  if (!array) { return false }

  const lowerStr = lower(str)
  return array?.some(item => item !== str && lower(item) === lowerStr)
}

/**
 * Add unique new tags to contacts if they don't have that tag,
 * and delete duplicate tags tags and when they're common in all contacts.
 *
 * @param {UUID[]} contacts
 * @param {string[]} newTags
 * @param {UUID} user
 * @param {UUID} brand
 * @param {boolean} shouldDelete
 */
async function updateTags(contacts, newTags, user, brand, shouldDelete) {
  newTags = belt.uniqCaseInsensitive(newTags)

  const tag_attributes = await Attribute.getForContacts(contacts, undefined, [ 'tag' ])
  /** @type {Map<UUID, string[]>} */
  const by_contact = new Map()

  /** @type {Map<string, number>} */
  const tag_count = new Map()

  /** @type {Map<string, UUID[]>} */
  const by_tag = new Map()

  /** @type {IContactAttribute['id'][]} */
  const to_delete = []

  for (const id of contacts) {
    by_contact.set(id, [])
  }

  for (const attr of tag_attributes) {
    const entry = by_contact.get(attr.contact)
    const is_dupe = entry?.includes(attr.text)
    if (!is_dupe) {
      entry?.push(attr.text)
    }

    if (!newTags.includes(attr.text)) {
      const tag_ids = by_tag.get(attr.text) ?? []
      tag_ids.push(attr.id)
      by_tag.set(attr.text, tag_ids)

      if (!is_dupe) {
        const count = tag_count.get(attr.text) ?? 0
        tag_count.set(attr.text, count + 1)
      }
    }

    if (shouldDelete && (is_dupe || includesWithDifferentCase(newTags, attr.text))) {
      to_delete.push(attr.id)
    }
  }

  const to_add = contacts.flatMap(id => {
    const tags_to_add = shouldDelete
      ? _.difference(newTags, by_contact.get(id) ?? [])
      : _.differenceBy(newTags, by_contact.get(id) ?? [], lower)

    return tags_to_add.map(t => ({
      attribute_type: 'tag',
      text: t,
      contact: id,
      created_by: user,
    }))
  })

  if (shouldDelete) {
    const unwanted_common_tags = [...tag_count.entries()].filter(([, count]) => count === contacts.length).map(([tag, ]) => tag)
    to_delete.push(...unwanted_common_tags.flatMap(t => by_tag.get(t) ?? []))

    if (to_delete.length > 0) {
      await Attribute.delete([...new Set(to_delete)], user)
    } else {
      // FIXME: This is a hack!! Fix event emitting logic everywhere
      Contact.emit('update', {
        user_id: user,
        brand_id: brand,
        contact_ids: contacts,
        event_type: 'update',
        reason: 'direct_request'
      })
    }
  } else {
    // FIXME: This is a hack!! Fix event emitting logic everywhere
    Contact.emit('update', {
      user_id: user,
      brand_id: brand,
      contact_ids: contacts,
      event_type: 'update',
      reason: 'direct_request'
    })
  }

  await Attribute.create(to_add, user, brand)
}

module.exports = {
  updateTags
}
