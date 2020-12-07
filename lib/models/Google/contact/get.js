const db = require('../../../utils/db.js')
const sq = require('../../../utils/squel_extensions')



/**
 * @param {UUID[]} entry_ids
 * @param {UUID} google_credential
 */
const getAll = async (entry_ids, google_credential) => {
  const contacts = await db.select('google/contact/get', [entry_ids, google_credential])

  return contacts
}

/**
 * @param {UUID} entry_id
 * @param {UUID} google_credential
 */
const get = async (entry_id, google_credential) => {
  const contacts = await getAll([entry_id], google_credential)

  if (contacts.length < 1)
    return null

  return contacts[0]
}

/**
 * @param {UUID} google_credential
 */
const getGCredentialContactsNum = async (google_credential) => {
  return await db.select('google/contact/count', [google_credential])
}

const filter = async ({ google_credential, processed_photo }) => {
  const query = sq.select()
    .field('id, entry_id, processed_photo, photo')
    .from('google_contacts')

  if (google_credential) {
    query.where('google_credential = ?', google_credential)
  }

  if ( processed_photo !== null ) {
    query.where('processed_photo IS ?', processed_photo)
  }

  query.where('deleted_at IS NULL')

  return await db.select(query, [])
}


/**
 * @param {UUID} google_credential
 */
const getRefinedContactGroups = async (google_credential) => {
  const contactGroups = await db.select('google/contact_group/get_by_credential', [google_credential])

  if (contactGroups.length > 0) {

    const refined = {}

    contactGroups.map(cg => {
      const key = cg.entry_id
      let val = cg.entry['title']['$t']

      if (cg.entry['gContact$systemGroup']) {
        if (cg.entry['gContact$systemGroup']['id'])
          val = cg.entry['gContact$systemGroup']['id']
      }

      refined[key] = val
    })

    return refined
  }

  return null
}


module.exports = {
  getAll,
  get,
  getGCredentialContactsNum,
  filter,
  getRefinedContactGroups
}