const _ = require('lodash')
const Context = require('../../../Context')

const User                = require('../../../User')
const AttachedFile        = require('../../../AttachedFile')
const MicrosoftCredential = require('../../credential')
const MicrosoftContact    = require('../../contact')
const Contact             = require('../../../Contact/index')
const ContactAttribute    = require('../../../Contact/attribute')

const targetKeys = [
  'givenName', 'surname', 'middleName', 'nickName', 'title',
  'photo', 'parentFolderId', 'birthday', 'personalNotes',
  'jobTitle', 'companyName', 'businessHomePage',
  'mobilePhone', 'homePhones', 'businessPhones',
  'emailAddresses', 'homeAddress', 'businessAddress', 'otherAddress'
]


const extractPhoto = async (microsoft, userId, brand, contact) => {
  try {
    const { imageData } = await microsoft.getContactPhoto(contact.id)

    if (!imageData)
      return null

    // const fs = require('fs').promises
    // await fs.writeFile(`/home/saeed/Desktop/${contact.id}.jpg`, Buffer.from(imageData))

    const user = await User.get(userId)

    const file = await AttachedFile.saveFromBuffer({
      buffer: Buffer.from(imageData, 'binary'),
      filename: `microsoft_cover_${contact.id}.jpg`,
      relations: [],
      path: `${brand}/avatars`,
      user: user,
      public: true,
    })

    return file

  } catch (ex) {
    return null
  }
}

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

  for (const k in a)
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

const findNewAttributes = (contact, oldAttributes) => {
  const rawData     = contact.rawData
  const oldRawData  = contact.oldRawData
  const refinedAtts = _.groupBy(oldAttributes, function(entry) { return entry.attribute_type})

  /** @type {IContactAttributeInput[]} */
  const attributes = []


  // Singular Attributes
  if ( rawData.givenName !== oldRawData.givenName ) {
    const firstNameAtt = refinedAtts.first_name ? (refinedAtts.first_name.length ? refinedAtts.first_name[0].text : null) : null

    if (rawData.givenName && !firstNameAtt)
      attributes.push({ attribute_type: 'first_name', text: rawData.givenName })
  }

  if ( rawData.surname !== oldRawData.surname ) {
    const lastNameAtt = refinedAtts.last_name ? (refinedAtts.last_name.length ? refinedAtts.last_name[0].text : null) : null

    if (rawData.surname && !lastNameAtt)
      attributes.push({ attribute_type: 'last_name', text: rawData.surname })
  }

  if ( rawData.middleName !== oldRawData.middleName ) {
    const middleNameAtt = refinedAtts.middle_name ? (refinedAtts.middle_name.length ? refinedAtts.middle_name[0].text : null) : null

    if (rawData.middleName && !middleNameAtt)
      attributes.push({ attribute_type: 'middle_name', text: rawData.middleName })
  }

  if ( rawData.nickName !== oldRawData.nickName ) {
    const nickNameAtt = refinedAtts.nickname ? (refinedAtts.nickname.length ? refinedAtts.nickname[0].text : null) : null

    if (rawData.nickName && !nickNameAtt)
      attributes.push({ attribute_type: 'nickname', text: rawData.nickName })
  }

  if ( rawData.title !== oldRawData.title ) {
    const titleAtt = refinedAtts.title ? (refinedAtts.title.length ? refinedAtts.title[0].text : null) : null

    if (rawData.title && !titleAtt)
      attributes.push({ attribute_type: 'title', text: rawData.title })
  }


  if ( rawData.jobTitle !== oldRawData.jobTitle ) {
    const jobTitleAtt = refinedAtts.job_title ? (refinedAtts.job_title.length ? refinedAtts.job_title[0].text : null) : null

    if (rawData.jobTitle && !jobTitleAtt)
      attributes.push({ attribute_type: 'job_title', text: rawData.jobTitle })
  }

  if ( rawData.companyName !== oldRawData.companyName ) {
    const companyAtt = refinedAtts.company ? (refinedAtts.company.length ? refinedAtts.company[0].text : null) : null

    if (rawData.companyName && !companyAtt)
      attributes.push({ attribute_type: 'company', text: rawData.companyName })
  }


  if ( rawData.birthday !== oldRawData.birthday ) {
    const birthdayAtt = refinedAtts.birthday ? (refinedAtts.birthday.length ? refinedAtts.birthday[0].date : null) : null

    if (rawData.birthday && !birthdayAtt) {
      const birthday = new Date(rawData.birthday)
      attributes.push({ attribute_type: 'birthday', date: birthday.getTime() / 1000 })
    }
  }

  if ( rawData.businessHomePage !== oldRawData.businessHomePage ) {
    const websiteeAtt = refinedAtts.website ? (refinedAtts.website.length ? refinedAtts.website[0].text : null) : null

    if (rawData.businessHomePage && !websiteeAtt)
      attributes.push({ attribute_type: 'website', text: rawData.businessHomePage })
  }



  // None Singulr Attributes
  if ( rawData.personalNotes !== oldRawData.personalNotes ) {
    if (rawData.personalNotes)
      attributes.push({ attribute_type: 'note', text: rawData.personalNotes })
  }


  const oldPhoneNumbers = refinedAtts.phone_number ? (refinedAtts.phone_number.map(entry => entry.text)) : []

  if ( rawData.mobilePhone !== oldRawData.mobilePhone ) {
    if ( rawData.mobilePhone && !oldPhoneNumbers.includes(rawData.mobilePhone) ) {
      attributes.push({
        attribute_type: 'phone_number',
        text: rawData.mobilePhone,
        label: 'Mobile',
        is_primary: false
      })
    }
  }

  if ( !_.isEqual(rawData.homePhones, oldRawData.homePhones) ) {
    for ( const phone of rawData.homePhones ) {
      if ( !oldPhoneNumbers.includes(phone) ) {
        attributes.push({
          attribute_type: 'phone_number',
          text: phone,
          label: 'Home',
          is_primary: false
        })
      }
    }
  }

  if ( !_.isEqual(rawData.businessPhones, oldRawData.businessPhones) ) {
    for ( const phone of rawData.businessPhones ) {
      if ( !oldPhoneNumbers.includes(phone) ) {
        attributes.push({
          attribute_type: 'phone_number',
          text: phone,
          label: 'Work',
          is_primary: false
        })
      }
    }
  }


  const oldEmails   = refinedAtts.email ? (refinedAtts.email.map(entry => entry.text)) : []
  const map_1       = oldRawData.emailAddresses ? (oldRawData.emailAddresses.map(entry => entry.address)) : []
  const map_2       = rawData.emailAddresses ? (rawData.emailAddresses.map(entry => entry.address)) : []
  const emailsDiff  = getArrayDiff(map_1, map_2)

  for ( const email of emailsDiff ) {
    if ( !oldEmails.includes(email) ) {
      attributes.push({
        attribute_type: 'email',
        text: email,
        label: 'Other',
        is_primary: false
      })
    }
  }


  let maxIndex     = 1
  const addressArr = [...refinedAtts.postal_code || [], ...refinedAtts.street_name || [], ...refinedAtts.city || [], ...refinedAtts.country || []]

  for ( const entry of addressArr ) {
    if ( Number(entry.index) > maxIndex )
      maxIndex = Number(entry.index)
  }

  if ( !_.isEqual(rawData.homeAddress, oldRawData.homeAddress) ) {
    maxIndex ++

    if (rawData.homeAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: rawData.homeAddress.street,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.homeAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: rawData.homeAddress.city,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.homeAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: rawData.homeAddress.countryOrRegion,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.homeAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: rawData.homeAddress.postalCode,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  }

  if ( !_.isEqual(rawData.businessAddress, oldRawData.businessAddress) ) {
    maxIndex ++

    if (rawData.businessAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: rawData.businessAddress.street,
        label: 'Work',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.businessAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: rawData.businessAddress.city,
        label: 'Work',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.businessAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: rawData.businessAddress.countryOrRegion,
        label: 'Work',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.businessAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: rawData.businessAddress.postalCode,
        label: 'Work',
        index: maxIndex,
        is_primary: true
      })
    }
  }

  if ( !_.isEqual(rawData.otherAddress, oldRawData.otherAddress) ) {
    maxIndex ++

    if (rawData.otherAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: rawData.otherAddress.street,
        label: 'Other',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.otherAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: rawData.otherAddress.city,
        label: 'Other',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.otherAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: rawData.otherAddress.countryOrRegion,
        label: 'Other',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.otherAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: rawData.otherAddress.postalCode,
        label: 'Other',
        index: maxIndex,
        is_primary: true
      })
    }
  }

  return attributes
}

const syncContacts = async (microsoft, data) => {
  const credentialId = data.microsoftCredential.id
  const lastSyncAt   = data.microsoftCredential.contacts_last_sync_at
  const brand        = data.microsoftCredential.brand
  const user         = data.microsoftCredential.user
  
  const records            = []
  const toUpdateRecords    = []
  const newContacts        = []
  const toUpdateContacts   = []
  const toUpdateContactIds = []
  const contactsMap        = {}

  let createdNum = 0

  const projection = [
    'id', 'createdDateTime', 'lastModifiedDateTime', 'changeKey', 'parentFolderId',
    'displayName', 'givenName', 'middleName', 'nickName', 'surname', 'title',
    'jobTitle', 'companyName',
    'businessHomePage', 'birthday', 'personalNotes',
    'homePhones', 'mobilePhone', 'businessPhones',
    'emailAddresses', 'homeAddress', 'businessAddress', 'otherAddress',
  ]

  try {

    Context.log('SyncMicrosoft - syncContacts 1', data.microsoftCredential.email)

    const folders  = await MicrosoftContact.getCredentialFolders(credentialId)
    const contacts = await microsoft.getContactsNative(lastSyncAt, folders, projection)

    Context.log('SyncMicrosoft - syncContacts 2 - contacts.length:', contacts.length, data.microsoftCredential.email)

    if (contacts.length) {
      
      for (const contact of contacts) {
        const file = await extractPhoto(microsoft, user, brand, contact)
        if (file) {
          contact.photo = file.url
        }
      }

      Context.log('SyncMicrosoft - syncContacts 2', data.microsoftCredential.email)
  
      const remoteIdsArr         = contacts.map(c => c.id)
      const oldMicrosoftContacts = await MicrosoftContact.getAllBySource(remoteIdsArr, credentialId, 'contacts')
      const contactFolders       = await MicrosoftContact.getRefinedContactFolders(credentialId)
      const oldMicrosoftContactRemoteIds = oldMicrosoftContacts.map(c => c.remote_id)

      for (const contact of contacts) {
        if ( oldMicrosoftContactRemoteIds.includes(contact.id) ) {

          const oldMContact = await MicrosoftContact.get(contact.id, credentialId)

          if ( !oldMContact.deleted_at && (oldMContact.data.changeKey !== contact.changeKey) ) {

            const result = await Contact.fastFilter(brand, [], { microsoft_id: oldMContact.id })

            if (result.ids[0]) {
              toUpdateContactIds.push(result.ids[0])

              contactsMap[result.ids[0]] = {
                rawData: contact,
                oldRawData: oldMContact.data,
              }
            }

            toUpdateRecords.push({ microsoft_credential: credentialId, remote_id: contact.id, data: JSON.stringify(contact) })
          }          

        } else {

          records.push({ microsoft_credential: credentialId, remote_id: contact.id, data: JSON.stringify(contact) })
        }
      }

      if ( toUpdateContactIds.length ) {
        const contactsAtts = await ContactAttribute.getForContacts(toUpdateContactIds)
        const refinedAtts  = _.groupBy(contactsAtts, function(entry) { return entry.contact})
  
        for (const key in refinedAtts) {
          const newAttributes = findNewAttributes(contactsMap[key], refinedAtts[key])

          if (newAttributes.length)
            toUpdateContacts.push({ id: key, attributes: newAttributes })
        }
      }

      // New Contacts
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

      Context.log('SyncMicrosoft - syncContacts 3', data.microsoftCredential.email)

      // Updated Contacts
      await MicrosoftContact.create(toUpdateRecords)
      await Contact.update(toUpdateContacts, user, brand, 'microsoft_integration')

      Context.log('SyncMicrosoft - syncContacts 4', data.microsoftCredential.email)

      // New Contacts
      if (newContacts.length)
        await Contact.create(newContacts, user, brand, 'microsoft_integration', { activity: false, relax: true, get: false })

      createdNum = createdMicrosoftContacts.length
    }

    const totalContactsNum = await MicrosoftContact.getMCredentialContactsNum(credentialId, ['contacts'])

    await MicrosoftCredential.updateContactsLastSyncAt(credentialId)

    Context.log('SyncMicrosoft - syncContacts 5', data.microsoftCredential.email)

    return {
      status: true,
      createdNum,
      totalNum: totalContactsNum[0]['count']
    }

  } catch (ex) {

    return  {
      status: false,
      createdNum: 0,
      totalNum: 0,
      ex
    }
  }
}


module.exports = {
  syncContacts
}
