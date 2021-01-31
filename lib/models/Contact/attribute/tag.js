const _ = require('lodash')
const Attribute = {
  ...require('./get'),
  ...require('./manipulate'),
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
  /** @type {Map<UUID, string[]>} */
  const by_contact = new Map()

  /** @type {Map<string, number>} */
  const tag_count = new Map()

  /** @type {Map<string, UUID[]>} */
  const by_tag = new Map()

  for (const id of contacts) {
    by_contact.set(id, [])
  }

  for (const attr of tag_attributes) {
    const entry = by_contact.get(attr.contact)
    entry.push(attr.text)

    if (!newTags.includes(attr.text)) {
      const tag_ids = by_tag.get(attr.text) ?? []
      tag_ids.push(attr.id)
      by_tag.set(attr.text, tag_ids)

      const count = tag_count.get(attr.text) ?? 0
      tag_count.set(attr.text, count + 1)
    }
  }

  const to_add = contacts.flatMap(id => _.difference(newTags, by_contact.get(id)).map(t => ({
    attribute_type: 'tag',
    text: t,
    contact: id,
    created_by: user
  })))

  if (shouldDelete) {
    const unwanted_common_tags = [...tag_count.entries()].filter(([, count]) => count === contacts.length).map(([tag, ]) => tag)
    const to_delete = unwanted_common_tags.flatMap(t => by_tag.get(t) ?? [])

    await Attribute.delete(to_delete, user)
  }
  await Attribute.create(to_add, user, brand)
}

module.exports = {
  updateTags
}
