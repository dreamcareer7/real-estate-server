const _ = require('lodash')

// const User             = require('../../../User')
// const AttachedFile     = require('../../../AttachedFile')
const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const Contact             = require('../../../Contact/index')


const targetKeys = [
  'givenName', 'surname', 'middleName', 'nickName', 'title',
  'photo', 'parentFolderId', 'birthday', 'personalNotes',
  'jobTitle', 'companyName', 'businessHomePage',
  'mobilePhone', 'homePhones', 'businessPhones',
  'emailAddresses', 'homeAddress', 'businessAddress', 'otherAddress'
]


/*const extractPhoto = async (microsft, userId, brand, contact) => {
  try {
    const { imageInfo, requestObj } = await microsft.getContactPhotoReqObj(contact.id)

    if (!requestObj)
      return null

    const user = await User.get(userId)

    const file = await AttachedFile.saveFromUrl({
      url: requestObj,
      filename: `microsft_cover_${contact.id}.jpg`,
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

const getArrayDiff = (arr_1, arr_2) => {
  const a_1 = [...new Set(arr_1)]
  const a_2 = [...new Set(arr_2)]

  const a    = []
  const diff = []

  for (let i = 0; i < a_1.length; i++)
    a[a_1[i]] = true

  for (let i = 0; i < a_2.length; i++) {
    if (a[a_2[i]]) 
      delete a[a_2[i]]
    else
      a[a_2[i]] = true
  }

  for (let k in a)
    diff.push(k)

  return diff
}

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

const findNewAttributes = async (contact, oldData) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []


  if ( contact.givenName !== oldData.givenName ) {
    if (contact.givenName)
      attributes.push({ attribute_type: 'first_name', text: contact.givenName })
  }

  if ( contact.surname !== oldData.surname ) {
    if (contact.surname)
      attributes.push({ attribute_type: 'last_name', text: contact.surname })
  }

  if ( contact.middleName !== oldData.middleName ) {
    if (contact.middleName)
      attributes.push({ attribute_type: 'middle_name', text: contact.middleName })
  }

  if ( contact.nickName !== oldData.nickName ) {
    if (contact.nickName)
      attributes.push({ attribute_type: 'nickname', text: contact.nickName })
  }

  if ( contact.title !== oldData.title ) {
    if (contact.title)
      attributes.push({ attribute_type: 'title', text: contact.title })
  }


  if ( contact.jobTitle !== oldData.jobTitle ) {
    if (contact.jobTitle)
      attributes.push({ attribute_type: 'job_title', text: contact.jobTitle })
  }

  if ( contact.companyName !== oldData.companyName ) {
    if (contact.companyName)
      attributes.push({ attribute_type: 'company', text: contact.companyName })
  }


  if ( contact.birthday !== oldData.birthday ) {
    if (contact.birthday) {
      const birthday = new Date(contact.birthday)
      attributes.push({ attribute_type: 'birthday', date: birthday.getTime() / 1000 })
    }
  }


  if ( contact.businessHomePage !== oldData.businessHomePage ) {
    if (contact.businessHomePage)
      attributes.push({ attribute_type: 'website', text: contact.businessHomePage })
  }


  if ( contact.personalNotes !== oldData.personalNotes ) {
    if (contact.personalNotes)
      attributes.push({ attribute_type: 'note', text: contact.personalNotes })
  }


  if ( contact.mobilePhone !== oldData.mobilePhone ) {
    if (contact.mobilePhone) {
      attributes.push({
        attribute_type: 'phone_number',
        text: contact.mobilePhone,
        label: 'Mobile',
        is_primary: false
      })
    }
  }

  
  const homePhonesDiff = getArrayDiff(contact.homePhones, oldData.homePhones)

  if ( homePhonesDiff.length ) {
    for (let i = 0; i < homePhonesDiff.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: homePhonesDiff[i],
        label: 'Home',
        is_primary: false
      })
    }
  }

  const businessPhonesDiff = getArrayDiff(contact.businessPhones, oldData.businessPhones)

  if ( businessPhonesDiff.length ) {
    for (let i = 0; i < businessPhonesDiff.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: businessPhonesDiff[i],
        label: 'Work',
        is_primary: false
      })
    }
  }


  const map_1 = oldData.emailAddresses.map(entry => entry.address)
  const map_2 = contact.emailAddresses.map(entry => entry.address)
  const diff  = getArrayDiff(map_1, map_2)

  if ( diff.length ) {
    for (let i = 0; i < homePhonesDiff.length; i++) {
      attributes.push({
        attribute_type: 'email',
        text: diff[i],
        label: 'Other',
        is_primary: false
      })
    }
  }

  

  if ( !_.isEqual(contact.homeAddress, oldData.homeAddress) ) {
    if (contact.homeAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: contact.homeAddress.street,
        label: 'Home',
        index: 100,
        is_primary: true
      })
    }
  
    if (contact.homeAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: contact.homeAddress.city,
        label: 'Home',
        index: 100,
        is_primary: true
      })
    }
  
    if (contact.homeAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: contact.homeAddress.countryOrRegion,
        label: 'Home',
        index: 100,
        is_primary: true
      })
    }
  
    if (contact.homeAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: contact.homeAddress.postalCode,
        label: 'Home',
        index: 100,
        is_primary: true
      })
    }
  }

  if ( !_.isEqual(contact.businessAddress, oldData.businessAddress) ) {
    if (contact.businessAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: contact.businessAddress.street,
        label: 'Work',
        index: 200,
        is_primary: true
      })
    }
  
    if (contact.businessAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: contact.businessAddress.city,
        label: 'Work',
        index: 200,
        is_primary: true
      })
    }
  
    if (contact.businessAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: contact.businessAddress.countryOrRegion,
        label: 'Work',
        index: 200,
        is_primary: true
      })
    }
  
    if (contact.businessAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: contact.businessAddress.postalCode,
        label: 'Work',
        index: 200,
        is_primary: true
      })
    }
  }

  if ( !_.isEqual(contact.otherAddress, oldData.otherAddress) ) {
    if (contact.otherAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: contact.otherAddress.street,
        label: 'Other',
        index: 300,
        is_primary: true
      })
    }
  
    if (contact.otherAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: contact.otherAddress.city,
        label: 'Other',
        index: 300,
        is_primary: true
      })
    }
  
    if (contact.otherAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: contact.otherAddress.countryOrRegion,
        label: 'Other',
        index: 300,
        is_primary: true
      })
    }
  
    if (contact.otherAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: contact.otherAddress.postalCode,
        label: 'Other',
        index: 300,
        is_primary: true
      })
    }
  }


  return attributes
}

const syncContacts = async (microsft, data) => {
  const credentialId = data.microsoftCredential.id
  const lastSyncAt   = null // data.microsoftCredential.contacts_last_sync_at
  const brand        = data.microsoftCredential.brand
  const user         = data.microsoftCredential.user
  
  const records          = []
  const toUpdateRecords  = []
  const newContacts      = []
  const toUpdateContacts = []

  let createdNum = 0

  try {

    const folders  = await MicrosoftContact.getCredentialFolders(credentialId)
    const contacts = await microsft.getContacts(lastSyncAt, folders)

    if (contacts.length) {
      
      for (const contact of contacts) {
        // const file = await extractPhoto(microsft, user, brand, contact)
        const file = { url: 'comming-soon' }
        if (file) {
          contact.photo = file.url
        }
      }
  
      const remoteIdsArr                 = contacts.map(c => c.id)
      const oldMicrosoftContacts         = await MicrosoftContact.getAllBySource(remoteIdsArr, credentialId, 'contacts')
      const contactFolders               = await MicrosoftContact.getRefinedContactFolders(credentialId)
      const oldMicrosoftContactRemoteIds = oldMicrosoftContacts.map(c => c.remote_id)
  
      for (const contact of contacts) {
        if ( oldMicrosoftContactRemoteIds.includes(contact.id) ) {

          const oldMContact = await MicrosoftContact.get(contact.id, credentialId)

          if ( !oldMContact.deleted_at && (oldMContact.data.changeKey !== contact.changeKey) ) {

            console.log('\n\n ***** oldMContact.id', oldMContact.id)
            const newAttributes = await findNewAttributes(contact, oldMContact.data)
            console.log('\n\n ***** newAttributes', newAttributes)
  
            const result = await Contact.filter(brand, [], { microsoft_id: oldMContact.id })
            // const oldAttributes = await ContactAttribute.getForContacts([result.ids[0]])

            toUpdateContacts.push({ id: result.ids[0], attributes: newAttributes })

            toUpdateRecords.push({ microsoft_credential: credentialId, remote_id: contact.id, data: JSON.stringify(contact) })
          }          

        } else {

          records.push({ microsoft_credential: credentialId, remote_id: contact.id, data: JSON.stringify(contact) })
        }
      }
  
      console.log('contacts.length', contacts.length)
      console.log('remoteIdsArr.length', remoteIdsArr.length)
      console.log('oldMicrosoftContacts.length', oldMicrosoftContacts.length)
      console.log('oldMicrosoftContactRemoteIds.length', oldMicrosoftContactRemoteIds.length)
      console.log('records.length', records.length)

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
  
      console.log('createdMicrosoftContacts.length', createdMicrosoftContacts.length)
      console.log('newContacts.length', newContacts.length)
  


      const updatedMicrosoftContacts = await MicrosoftContact.create(toUpdateRecords)
      const updatedContacts          = await Contact.update(toUpdateContacts, user, brand, 'microsoft_integration')

      console.log('updatedMicrosoftContacts.length', updatedMicrosoftContacts.length)
      console.log('updatedContacts.length', updatedContacts.length)


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