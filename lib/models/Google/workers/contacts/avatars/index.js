const config = require('../../../../../config')

const GoogleContact = require('../../../contact')
const Contact = {
  ...require('../../../../Contact/fast_filter'),
  ...require('../../../../Contact/manipulate'),
}

const { extractPhoto } = require('./photo')

const _REASON = config.google_integration.contact_update_reason



const syncAvatars = async (google, credential) => {
  const brand = credential.brand
  const user  = credential.user

  const toUpdateGoogleContacts = []
  const toUpdateContacts       = []

  const helper = async (gcontact) => {
    if (!gcontact.contact) {
      return
    }

    const file  = await extractPhoto(google, user, brand, gcontact)
    const photo = file ? file.url : null

    const google_credential = gcontact.google_credential
    const entry_id = gcontact.entry_id

    toUpdateGoogleContacts.push({ google_credential, entry_id, photo, processed_photo: true })

    if (photo) {
      const attributes = []
      attributes.push({ attribute_type: 'profile_image_url', text: photo })
      attributes.push({ attribute_type: 'cover_image_url', text: photo })

      toUpdateContacts.push({ id: gcontact.contact, attributes })
    }    
  }

  try {

    const googleContacts = await GoogleContact.filter({ google_credential: credential.id, processed_photo: false })

    if ( googleContacts.length === 0 ) {
      return {
        status: true
      }
    }

    let promises = []

    for (const gcontact of googleContacts) {
      promises.push(helper(gcontact))

      if ( promises.length && (promises.length % 3 === 0) ) {
        await Promise.all(promises)
        promises = []
      }
    }

    if (promises.length) {
      await Promise.all(promises)
      promises = []
    }

    // Updated Contacts
    await GoogleContact.bulkUpdate(toUpdateGoogleContacts)
    await Contact.update(toUpdateContacts, user, brand, _REASON)

    return {
      status: true
    }

  } catch (ex) {
  
    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  syncAvatars
}
