const User                = require('../../../User')
const AttachedFile        = require('../../../AttachedFile')
const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const Contact             = require('../../../Contact/index')


const targetKeys = ['names', 'note', 'photo', 'website', 'birthday', 'organization', 'groupMembership', 'addresses', 'emailes', 'phones']


const parseAttributes = (key, data, contactFolders) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'names' ) {
    if (data.names.givenName) {
      attributes.push({
        attribute_type: 'first_name',
        text: data.names.givenName
      })
    }

    if (data.names.familyName) {
      attributes.push({
        attribute_type: 'last_name',
        text: data.names.familyName
      })
    }

    if (data.names.additionalName) {
      attributes.push({
        attribute_type: 'middle_name',
        text: data.names.additionalName
      })
    }

    if (data.names.nickName) {
      attributes.push({
        attribute_type: 'nickname',
        text: data.names.nickName
      })
    }
  }

  if (key === 'photo') {
    if (data.photo) {
      attributes.push({ attribute_type: 'profile_image_url', text: data.photo })
      attributes.push({ attribute_type: 'cover_image_url', text: data.photo })
    }
  }

  if (key === 'website') {
    if (data.website)
      attributes.push({ attribute_type: 'website', text: data.website })
  }

  if (key === 'birthday') {
    if (data.birthday) {
      const arr = data.birthday.split('-') // sample: 1980-10-07

      if ( arr.length === 3 ) {
        const birthday = new Date(arr[0], arr[1] - 1, arr[2], 0, 0, 0)

        attributes.push({
          attribute_type: 'birthday',
          date: birthday.getTime() / 1000
        })
      }
    }
  }

  if (key === 'note') {
    if (data.note)
      attributes.push({ attribute_type: 'note', text: data.note })
  }

  if (key === 'organization') {
    if (data.organization.company)
      attributes.push({ attribute_type: 'company', text: data.organization.company })

    if (data.organization.jobTitle)
      attributes.push({ attribute_type: 'job_title', text: data.organization.jobTitle })
  }

  if (key === 'groupMembership') {
    if ( contactFolders && data.groupMembership ) {
      if (contactFolders[data.groupMembership])
        attributes.push({ attribute_type: 'tag', text: contactFolders[data.groupMembership] })
    }
  }

  if (key === 'addresses') {
    for (let i = 0; i < data.addresses.length; i++) {

      const addressObj = data.addresses[i]

      let label = 'Other'

      if ( addressObj.label.toLowerCase() === 'home' )
        label = 'Home'

      if ( addressObj.label.toLowerCase() === 'work' )
        label = 'Work'

      if ( addressObj.label.toLowerCase() === 'investment property' )
        label = 'Investment Property'
        

      if (addressObj.city) {
        attributes.push({
          attribute_type: 'city',
          text: addressObj.city,
          label: label,
          index: i + 1,
          is_primary: i === 0 ? true : false
        })
      }

      if (addressObj.country) {
        attributes.push({
          attribute_type: 'country',
          text: addressObj.country,
          label: label,
          index: i + 1,
          is_primary: i === 0 ? true : false
        })
      }

      if (addressObj.postalCode) {
        attributes.push({
          attribute_type: 'postal_code',
          text: addressObj.postalCode,
          label: label,
          index: i + 1,
          is_primary: i === 0 ? true : false
        })
      }

      if (addressObj.streetAddress) {
        attributes.push({
          attribute_type: 'street_name',
          text: addressObj.streetAddress,
          label: label,
          index: i + 1,
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  if (key === 'emailes') {
    for (let i = 0; i < data.emailes.length; i++) {

      const emailObj = data.emailes[i]

      let label = 'Other'

      if ( emailObj.label.toLowerCase() === 'personal' )
        label = 'Personal'

      if ( emailObj.label.toLowerCase() === 'work' )
        label = 'Work'

      if (emailObj.value) {
        attributes.push({
          attribute_type: 'email',
          text: emailObj.address,
          label: label,
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  if (key === 'phones') {
    for (let i = 0; i < data.phones.length; i++) {

      const phoneObj = data.phones[i]

      let label = 'Other'

      if ( phoneObj.label.toLowerCase() === 'home' )
        label = 'Home'

      if ( phoneObj.label.toLowerCase() === 'mobile' )
        label = 'Mobile'

      if ( phoneObj.label.toLowerCase() === 'work' )
        label = 'Work'

      if ( phoneObj.label.toLowerCase() === 'fax' )
        label = 'Fax'

      if ( phoneObj.label.toLowerCase() === 'whatsApp' )
        label = 'WhatsApp'

      if (phoneObj.value) {
        attributes.push({
          attribute_type: 'phone_number',
          text: phoneObj.phoneNumber,
          label: label,
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  return attributes
}

const extractPhoto = async (microsft, userId, brand, conn) => {
  try {
    const imagedata = await microsft.getContactPhoto(conn.photo)
    const user      = await User.get(userId)

    const file = await AttachedFile.saveFromBuffer({
      filename: `microsft_cover_${conn.id}.jpg`,
      relations: [],
      path: `${brand}/avatars`,
      user: user,
      public: false,
      buffer: imagedata
    })

    return file

  } catch (ex) {

    return null
  }
}

const syncContacts = async (microsft, data) => {
  const lastSyncAt   = null // data.microsoftCredential.contacts_last_sync_at || data.microsoftCredential.last_sync_at
  const credentialId = data.microsoftCredential.id
  const user         = data.microsoftCredential.user
  const brand        = data.microsoftCredential.brand
  
  const records      = []
  const newContacts  = []

  try {

    const folders     = await MicrosoftContact.getCredentialFolders(credentialId)
    const connections = await microsft.getContacts(lastSyncAt, folders)

    if (!connections.length)
      return { status: true }
  
    // for (const conn of connections) {
    //   if (!conn.photo)
    //     continue

    //   const file = await extractPhoto(microsft, user, brand, conn)
    //   if (file) {
    //     conn.photo = file.url
    //   }
    // }

    const remoteIdsArr                = connections.map(c => c.id)
    const oldMicrosoftContacts        = await MicrosoftContact.getAll(remoteIdsArr, credentialId)
    const oldMicrosoftContactEntryIds = oldMicrosoftContacts.map(c => c.id)
    const contactFolders              = await MicrosoftContact.getRefinedContactFolders(credentialId)

    for (const conn of connections) {
      if ( !oldMicrosoftContactEntryIds.includes(conn.id) )
        records.push({ microsoft_credential: credentialId, remote_id: conn.id, data: JSON.stringify(conn) })
    }

    console.log('connections.length', connections.length)
    console.log('remoteIdsArr.length', remoteIdsArr.length)
    console.log('oldMicrosoftContacts.length', oldMicrosoftContacts.length)
    console.log('oldMicrosoftContactEntryIds.length', oldMicrosoftContactEntryIds.length)
    console.log('records.length', records.length)

    const createdMicrosoftContacts = await MicrosoftContact.create(records)

    for (const createdMicrosoftContact of createdMicrosoftContacts) {

      /** @type {IContactInput} */
      const contact = {
        user: user,
        microsoft_id: createdMicrosoftContact.id,
        attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }]
      }

      // for (const key in createdMicrosoftContact.data) {
      //   if (targetKeys.indexOf(key) >= 0) {
      //     const attributes = parseAttributes(key, createdMicrosoftContact.data, contactFolders)
      //     contact.attributes = contact.attributes.concat(attributes)
      //   }
      // }

      newContacts.push(contact)
    }

    console.log('createdMicrosoftContacts.length', createdMicrosoftContacts.length)
    console.log('newContacts.length', newContacts.length)

    if (newContacts.length)
      await Contact.create(newContacts, user, brand, 'google_integration', { activity: false, relax: true, get: false })

    await MicrosoftCredential.updateContactsLastSyncAt(credentialId)

    const totalContactsNum = await MicrosoftContact.getGCredentialContactsNum(credentialId)

    return {
      status: true,
      createdNum: createdMicrosoftContacts.length,
      totalNum: totalContactsNum[0]['count']
    }

  } catch (ex) {

    let err = { code: ex.statusCode || null, message: ex }

    if ( ex.statusCode === 401 )
      err = { code: 401, message: 'invalid_grant' }

    return  {
      status: false,
      ex: err
    }
  }
}


module.exports = {
  syncContacts
}