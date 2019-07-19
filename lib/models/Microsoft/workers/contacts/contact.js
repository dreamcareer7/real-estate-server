// const User                = require('../../../User')
// const AttachedFile        = require('../../../AttachedFile')
const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const Contact             = require('../../../Contact/index')


const targetKeys = [
  'givenName',
  'surname',
  'middleName',
  'nickName',
  'title',
  'photo',
  'parentFolderId',
  'birthday',
  'jobTitle',
  'companyName',
  'businessHomePage',
  'personalNotes',
  'mobilePhone',
  'homePhones',
  'businessPhones',
  'emailAddresses',
  'homeAddress',
  'businessAddress',
  'otherAddress'
]


/*const extractPhoto = async (microsft, userId, brand, conn) => {
  try {
    const { imageInfo, requestObj } = await microsft.getContactPhotoReqObj(conn.id)

    if (!requestObj)
      return null

    const user = await User.get(userId)

    const file = await AttachedFile.saveFromUrl({
      url: requestObj,
      filename: `microsft_cover_${conn.id}.jpg`,
      relations: [],
      path: `${brand}/avatars`,
      user: user,
      public: false,
    })

    console.log('----- file', file)
    return file

  } catch (ex) {

    console.log('----- ex', ex)
    return null
  }
}*/

const parseAttributes = (key, data, contactFolders) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'givenName' ) {
    if (data.givenName) {
      attributes.push({
        attribute_type: 'first_name',
        text: data.givenName
      })
    }
  }

  if ( key === 'surname' ) {
    if (data.surname) {
      attributes.push({
        attribute_type: 'last_name',
        text: data.surname
      })
    }
  }

  if ( key === 'middleName' ) {
    if (data.middleName) {
      attributes.push({
        attribute_type: 'middle_name',
        text: data.middleName
      })
    }
  }

  if ( key === 'nickName' ) {
    if (data.nickName) {
      attributes.push({
        attribute_type: 'nickname',
        text: data.nickName
      })
    }
  }

  if ( key === 'title' ) {
    if (data.title) {
      attributes.push({
        attribute_type: 'title',
        text: data.title
      })
    }
  }

  if (key === 'photo') {
    if (data.photo) {
      attributes.push({ attribute_type: 'profile_image_url', text: data.photo })
      attributes.push({ attribute_type: 'cover_image_url', text: data.photo })
    }
  }

  if (key === 'parentFolderId') {
    if ( contactFolders && data.parentFolderId ) {
      if (contactFolders[data.parentFolderId])
        attributes.push({ attribute_type: 'tag', text: contactFolders[data.parentFolderId] })
    }
  }

  if (key === 'birthday') {
    if (data.birthday) {
      const birthday = new Date(data.birthday)

      attributes.push({
        attribute_type: 'birthday',
        date: birthday.getTime() / 1000
      })
    }
  }

  if (key === 'jobTitle') {
    if (data.jobTitle)
      attributes.push({ attribute_type: 'job_title', text: data.jobTitle })
  }

  if (key === 'companyName') {
    if (data.companyName)
      attributes.push({ attribute_type: 'company', text: data.companyName })
  }

  if (key === 'businessHomePage') {
    if (data.businessHomePage)
      attributes.push({ attribute_type: 'website', text: data.businessHomePage })
  }

  if (key === 'personalNotes') {
    if (data.personalNotes)
      attributes.push({ attribute_type: 'note', text: data.personalNotes })
  }

  if (key === 'mobilePhone') {
    if (data.mobilePhone) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.mobilePhone,
        label: 'Mobile',
        is_primary: false
      })
    }
  }

  if (key === 'homePhones') {
    for (let i = 0; i < data.homePhones.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.homePhones[i],
        label: 'Home',
        is_primary: i === 0 ? true : false
      })
    }
  }

  if (key === 'businessPhones') {
    for (let i = 0; i < data.businessPhones.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.businessPhones[i],
        label: 'Work',
        is_primary: i === 0 ? true : false
      })
    }
  }
  
  if (key === 'homeAddress') {
    if (data.homeAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.homeAddress.street,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data.homeAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.homeAddress.city,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data.homeAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.homeAddress.countryOrRegion,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data.homeAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.homeAddress.postalCode,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }
  }

  if (key === 'businessAddress') {
    if (data.businessAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.businessAddress.street,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data.businessAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.businessAddress.city,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data.businessAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.businessAddress.countryOrRegion,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data.businessAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.businessAddress.postalCode,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }
  }

  if (key === 'otherAddress') {
    if (data.otherAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.otherAddress.street,
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data.otherAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.otherAddress.city,
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data.otherAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.otherAddress.countryOrRegion,
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data.otherAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.otherAddress.postalCode,
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }
  }

  if (key === 'emailAddresses') {
    for (let i = 0; i < data.emailAddresses.length; i++) {
      attributes.push({
        attribute_type: 'email',
        text: data.emailAddresses[i]['address'],
        label: 'Other',
        is_primary: i === 0 ? true : false
      })
    }
  }

  return attributes
}

const syncContacts = async (microsft, data) => {
  const credentialId = data.microsoftCredential.id
  const lastSyncAt   = null //data.microsoftCredential.contacts_last_extract_at
  const brand        = data.microsoftCredential.brand
  const user         = data.microsoftCredential.user
  
  const records          = []
  const newContacts      = []
  // const toUpdateContacts = []

  let createdNum = 0

  try {

    const folders     = await MicrosoftContact.getCredentialFolders(credentialId)
    const connections = await microsft.getContacts(lastSyncAt, folders)

    if (connections.length) {
      
      for (const conn of connections) {
        // const file = await extractPhoto(microsft, user, brand, conn)
        const file = { url: 'comming-soon' }
        if (file) {
          conn.photo = file.url
        }
      }
  
      const remoteIdsArr                 = connections.map(c => c.id)
      const oldMicrosoftContacts         = await MicrosoftContact.getAllBySource(remoteIdsArr, credentialId, 'contacts')
      const contactFolders               = await MicrosoftContact.getRefinedContactFolders(credentialId)
      // const oldMicrosoftContactEmailSet  = await MicrosoftContact.getMCredentialContactsAddress(credentialId, ['sentBox'])
      const oldMicrosoftContactRemoteIds = oldMicrosoftContacts.map(c => c.remote_id)
  
      for (const conn of connections) {
        if ( !oldMicrosoftContactRemoteIds.includes(conn.id) ) {
          records.push({ microsoft_credential: credentialId, remote_id: conn.id, data: JSON.stringify(conn) })

          // let hasDuplicateEmail = false
          // let oldEmailAddresses = []

          // for (let index = 0; index < conn.emailAddresses.length; index ++ ) {
          //   if ( oldMicrosoftContactEmailSet.has(conn.emailAddresses[index]['address']) ) {
          //     hasDuplicateEmail = true
          //     oldEmailAddresses.push(conn.emailAddresses[index]['address'])
          //   }
          // }

          // if (hasDuplicateEmail) {

          //   toUpdateContacts.push({
          //     oldEmailAddresses: oldEmailAddresses,
          //     connection: conn
          //   })

          //   console.log('hasDuplicateEmail', toUpdateContacts)

          // } else {

          // records.push({ microsoft_credential: credentialId, remote_id: conn.id, data: JSON.stringify(conn) })
          // }
        }
      }
  
      // console.log('connections.length', connections.length)
      // console.log('remoteIdsArr.length', remoteIdsArr.length)
      // console.log('oldMicrosoftContacts.length', oldMicrosoftContacts.length)
      // console.log('oldMicrosoftContactRemoteIds.length', oldMicrosoftContactRemoteIds.length)
      // console.log('records.length', records.length)

      // return  { status: true, createdNum: 0, totalNum: 0, ex: null }

      const createdMicrosoftContacts = await MicrosoftContact.create(records)
  
      for (const createdMicrosoftContact of createdMicrosoftContacts) {
  
        /** @type {IContactInput} */
        const contact = {
          user: user,
          microsoft_id: createdMicrosoftContact.id,
          attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }]
        }
  
        for (const key in createdMicrosoftContact.data) {
          if (targetKeys.indexOf(key) >= 0) {
            const attributes = parseAttributes(key, createdMicrosoftContact.data, contactFolders)
            contact.attributes = contact.attributes.concat(attributes)
          }
        }
  
        newContacts.push(contact)
      }
  
      // console.log('createdMicrosoftContacts.length', createdMicrosoftContacts.length)
      // console.log('newContacts.length', newContacts.length)
  
      if (newContacts.length)
        await Contact.create(newContacts, user, brand, 'microsoft_integration', { activity: false, relax: true, get: false })

      createdNum = createdMicrosoftContacts.length
    }

    const totalContactsNum = await MicrosoftContact.getMCredentialContactsNum(credentialId, ['contacts'])

    await MicrosoftCredential.updateContactsLastSyncAt(credentialId)

    return {
      status: true,
      createdNum: createdNum,
      totalNum: totalContactsNum[0]['count']
    }

  } catch (ex) {

    return  {
      status: false,
      createdNum: 0,
      totalNum: 0,
      ex: ex
    }
  }
}


module.exports = {
  syncContacts
}