const MicrosoftContact = require('../../contact')
const Contact = {
  ...require('../../../Contact/fast_filter'),
  ...require('../../../Contact/manipulate')
}

const { extractPhoto } = require('./photo')

const { fiveXErr, ECONNRESET } = require('./static')



const syncAvatars = async (microsoft, credential) => {
  const brand = credential.brand
  const user  = credential.user

  const toUpdateMicContacts = []
  const toUpdateContacts    = []

  const helper = async (mcontact) => {
    const file  = await extractPhoto(microsoft, user, brand, mcontact)
    const photo = file ? file.url : null

    const microsoft_credential = mcontact.microsoft_credential
    const remote_id = mcontact.remote_id

    toUpdateMicContacts.push({ microsoft_credential, remote_id, photo, processed_photo: true })

    if (photo) {
      const result = await Contact.fastFilter(brand, [], { microsoft_id: mcontact.id })
      const relevantContactId = result.ids[0]

      if (!relevantContactId) {
        return
      }
  
      const attributes = []
      attributes.push({ attribute_type: 'profile_image_url', text: photo })
      attributes.push({ attribute_type: 'cover_image_url', text: photo })

      toUpdateContacts.push({ id: relevantContactId, attributes })
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
    await Contact.update(toUpdateContacts, user, brand, 'microsoft_integration')

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