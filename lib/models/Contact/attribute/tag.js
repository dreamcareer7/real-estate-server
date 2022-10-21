const _ = require('lodash')
const Contact = require('../emitter')
const Attribute = {
  ...require('./get'),
  ...require('./manipulate'),
}

/**
 * @param {Set<string>} set
 * @param {string} str
 */
function setIncludesIgnoreCase (set, str) {
  str = str.trim().toLowerCase()

  for (const mem of set) {
    if (mem.trim().toLowerCase() === str) {
      return true
    }
  }

  return false
}

/**
 * @param {Map<IContact['id'], Map<string, IContactAttribute['id']>>} contact_to_tag_to_attr
 * @returns {IContactAttribute['id'][]}
 */
function findCommonDuplicateTagIds (contact_to_tag_to_attr) {
  return _([...contact_to_tag_to_attr.values()])
    .map(tag_to_attr => [...tag_to_attr.keys()])
    .thru(tags => _.intersection(...tags))
    .flatMap(commonLower => {
      /** @type {IContactAttribute['id'][]} */
      const result = []

      for (const tags of remaining_tags.values()) {
        for (const [lower, id] of tags) {
          if (lower === commonLower) {
            result.push(id)
          }
        }
      }

      return result
    })
    .value()
}

/**
 * Add new tags to contacts if they don't have that tag,
 * and delete tags when they're common in all contacts.
 *
 * @param {UUID[]} contacts
 * @param {string[]} newTags
 * @param {UUID} user
 * @param {UUID} brand
 * @param {boolean} shouldDelete
 */
async function updateTags(contacts, newTags, user, brand, shouldDelete) {
  const tag_attributes = await Attribute.getForContacts(contacts, undefined, [ 'tag' ])

  const newTagsLower = new Set(newTags.map(nt => nt.trim().toLowerCase()))

  /** @type {Map<IContact['id'], Map<string, IContactAttribute['id']>>} */
  const remaining_tags = new Map(contacts.map(cid => [cid, new Map()]))

  const to = _(tag_attributes)
    .sortBy('index')
    .sortBy('created_at')
    .groupBy('contact')
    .mapValues((attrs, cid) => _.transform(attrs, (to, { text, id }) => {
      const lower = text.trim().toLowerCase()

      if (to.add.has(text)) {
        to.add.delete(text)
        to.keep.set(lower, id)
      } else if (to.keep.has(lower) || remaining_tags.get(cid)?.has(lower) || newTagsLower.has(lower)) {
        to.delete.add(id)
      } else {
        remaining_tags.get(cid)?.set(lower, id)
      }
    }, {
      /** @type {Map<IContactAttribute['text'], IContactAttribute['id']>} */
      keep: new Map(),
      /** @type {Set<IContactAttribute['text']>} */
      add: new Set(newTags),
      /** @type {Set<IContactAttribute['id']>} */
      delete: new Set(),
    }))
    .transform((reducedTo, to, contact) => {
      reducedTo.delete.push(...to.delete)

      to.add.forEach(text => reducedTo.add.push({
        attribute_type: 'tag',
        created_by: user,
        contact,
        text,
      }))
    }, {
      /** @type {IContactAttribute['id'][]} */
      delete: [],
      /** @type {IContactAttributeInputWithContact[]} */
      add: [],
    })
    .value()

  // XXX: shall we delete duplicates even when shouldDelete is false?
  to.delete.push(...findCommonDuplicateTagIds(remaining_tags))

  if (shouldDelete && to.delete.length) {
    await Attribute.delete(to.delete, user)
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

  await Attribute.create(to.add, user, brand)
}

module.exports = {
  updateTags
}
