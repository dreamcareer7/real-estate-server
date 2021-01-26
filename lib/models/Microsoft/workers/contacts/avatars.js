const config = require('../../../../config')

const MicrosoftContact = require('../../contact')
const Contact = {
  ...require('../../../Contact/fast_filter'),
  ...require('../../../Contact/manipulate')
}

const { extractPhoto } = require('./photo')

const { fiveXErr, ECONNRESET } = require('./static')

const _REASON = config.microsoft_integration.contact_update_reason



const syncAvatars = async (microsoft, credential) => {
  const brand = credential.brand
  const user  = credential.user

  const toUpdateMicContacts = []
  const toUpdateContacts    = []

  const helper = async (mcontact) => {
    if (!mcontact.contact) {
      return
    }

    const file  = await extractPhoto(microsoft, user, brand, mcontact)
    const photo = file ? file.url : null

    const microsoft_credential = mcontact.microsoft_credential
    const remote_id = mcontact.remote_id

    toUpdateMicContacts.push({ microsoft_credential, remote_id, photo, processed_photo: true })

    if (photo) {
      const attributes = []
      attributes.push({ attribute_type: 'profile_image_url', text: photo })
      attributes.push({ attribute_type: 'cover_image_url', text: photo })

      toUpdateContacts.push({ id: mcontact.contact, attributes })
    }    
  }

  try {

    const microsoftContacts = await MicrosoftContact.filter({ microsoft_credential: credential.id, source: 'contacts', processed_photo: false })

    if ( microsoftContacts.length === 0 ) {
      return {
        status: true
      }
    }

    let promises = []

    for (const mcontact of microsoftContacts) {
      promises.push(helper(mcontact))

      if ( promises.length && (promises.length % 5 === 0) ) {
        await Promise.all(promises)
        promises = []
      }
    }

    if (promises.length) {
      await Promise.all(promises)
      promises = []
    }

    // Updated Contacts
    await MicrosoftContact.bulkUpdate(toUpdateMicContacts)
    await Contact.update(toUpdateContacts, user, brand, _REASON)

    return {
      status: true
    }

  } catch (ex) {

    if ( fiveXErr.includes(Number(ex.statusCode)) || (ex.message === ECONNRESET) ) {    
      return  {
        status: false,
        skip: true,
        ex
      }
    }
      
    return  {
      status: false,
      skip: false,
      ex
    }
  }
}


module.exports = {
  syncAvatars
}