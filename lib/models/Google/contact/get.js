const db = require('../../../utils/db.js')


const getAll = async (entry_ids, google_credential) => {
  const contacts = await db.select('google/contact/get', [entry_ids, google_credential])

  return contacts
}

const get = async (entry_id, google_credential) => {
  const contacts = await getAll([entry_id], google_credential)

  if (contacts.length < 1)
    return null

  return contacts[0]
}

const getGCredentialContactsNum = async (google_credential) => {
  return await db.select('google/contact/count', [google_credential])
}

const getRefinedContactGroups = async (google_credential) => {
  const contactGroups = await db.select('google/contact_group/get_by_credential', [google_credential])

  if ( contactGroups.length > 0 ) {

    const refined = {}

    contactGroups.map(cg => {
      const key = cg.entry_id
      let val   = cg.entry['title']['$t']

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
  getRefinedContactGroups
}