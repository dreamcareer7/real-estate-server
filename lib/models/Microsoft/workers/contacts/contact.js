const _  = require('lodash')
const qs = require('querystring')

const User                = require('../../../User')
const AttachedFile        = require('../../../AttachedFile')
const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const Contact             = require('../../../Contact/index')


const targetKeys = ['names', 'note', 'photo', 'website', 'birthday', 'organization', 'groupMembership', 'addresses', 'emailes', 'phones']


const parseAttributes = (key, entry, contactFolders) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'names' ) {
    if (entry.names.givenName) {
      attributes.push({
        attribute_type: 'first_name',
        text: entry.names.givenName
      })
    }

    if (entry.names.familyName) {
      attributes.push({
        attribute_type: 'last_name',
        text: entry.names.familyName
      })
    }

    if (entry.names.additionalName) {
      attributes.push({
        attribute_type: 'middle_name',
        text: entry.names.additionalName
      })
    }

    if (entry.names.nickName) {
      attributes.push({
        attribute_type: 'nickname',
        text: entry.names.nickName
      })
    }
  }

  if (key === 'photo') {
    if (entry.photo) {
      attributes.push({ attribute_type: 'profile_image_url', text: entry.photo })
      attributes.push({ attribute_type: 'cover_image_url', text: entry.photo })
    }
  }

  if (key === 'website') {
    if (entry.website)
      attributes.push({ attribute_type: 'website', text: entry.website })
  }

  if (key === 'birthday') {
    if (entry.birthday) {
      const arr = entry.birthday.split('-') // sample: 1980-10-07

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
    if (entry.note)
      attributes.push({ attribute_type: 'note', text: entry.note })
  }

  if (key === 'organization') {
    if (entry.organization.company)
      attributes.push({ attribute_type: 'company', text: entry.organization.company })

    if (entry.organization.jobTitle)
      attributes.push({ attribute_type: 'job_title', text: entry.organization.jobTitle })
  }

  if (key === 'groupMembership') {
    if ( contactFolders && entry.groupMembership ) {
      if (contactFolders[entry.groupMembership])
        attributes.push({ attribute_type: 'tag', text: contactFolders[entry.groupMembership] })
    }
  }

  if (key === 'addresses') {
    for (let i = 0; i < entry.addresses.length; i++) {

      const addressObj = entry.addresses[i]

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
    for (let i = 0; i < entry.emailes.length; i++) {

      const emailObj = entry.emailes[i]

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
    for (let i = 0; i < entry.phones.length; i++) {

      const phoneObj = entry.phones[i]

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
      filename: `microsft_cover_${conn.entry_id}.jpg`,
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

const getContactFolders = (credentialId) => {
  return []
}

const syncContacts = async (microsft, data) => {
  const lastSyncAt   = data.microsftCredential.contacts_last_sync_at || data.microsftCredential.last_sync_at
  const credentialId = data.microsftCredential.id
  const user         = data.microsftCredential.user
  const brand        = data.microsftCredential.brand
  
  const records      = []
  const newContacts  = []

  try {

    const folders     = await getContactFolders(credentialId)
    const connections = await microsft.getContacts(lastSyncAt, folders)

    if (!connections.length)
      return { status: true }
  
    for (const conn of connections) {
      if (!conn.photo)
        continue

      const file = await extractPhoto(microsft, user, brand, conn)
      if (file) {
        conn.photo = file.url
        // console.log(conn.photo)
      }
    }

    const entryIdsArr                 = connections.map(c => c.entry_id)
    const oldMicrosoftContacts        = await MicrosoftContact.getAll(entryIdsArr, credentialId)
    const oldMicrosoftContactEntryIds = oldMicrosoftContacts.map(c => c.entry_id)
    const contactFolders              = await MicrosoftContact.getRefinedContactFolders(credentialId)

    for (const conn of connections) {
      if ( !oldMicrosoftContactEntryIds.includes(conn.entry_id) )
        records.push({ microsft_credential: credentialId, entry_id: conn.entry_id, entry: JSON.stringify(conn) })
    }

    // console.log('connections.length', connections.length)
    // console.log('entryIdsArr.length', entryIdsArr.length)
    // console.log('oldMicrosoftContacts.length', oldMicrosoftContacts.length)
    // console.log('oldMicrosoftContactEntryIds.length', oldMicrosoftContactEntryIds.length)
    // console.log('records.length', records.length)

    const createdMicrosoftContacts = await MicrosoftContact.create(records)

    for (const createdMicrosoftContact of createdMicrosoftContacts) {

      /** @type {IContactInput} */
      const contact = {
        user: user,
        microsft_id: createdMicrosoftContact.id,
        attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }]
      }

      for (const key in createdMicrosoftContact.entry) {
        if (targetKeys.indexOf(key) >= 0) {
          const attributes = parseAttributes(key, createdMicrosoftContact.entry, contactFolders)
          contact.attributes = contact.attributes.concat(attributes)
        }
      }

      if ( contact.attributes.length > 0 )
        newContacts.push(contact)
    }

    // console.log('createdMicrosoftContacts.length', createdMicrosoftContacts.length)
    // console.log('newContacts.length', newContacts.length)

    if (newContacts.length)
      await Contact.create(newContacts, user, brand, 'microsft_integration', { activity: false, relax: true, get: false })

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