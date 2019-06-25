const GoogleCredential = require('../credential')
const GoogleContact    = require('../contact')
const Contact          = require('../../Contact/index')


const targetKeys = ['names', 'nicknames', 'coverPhotos', 'photos', 'birthdays', 'emailAddresses', 'addresses', 'phoneNumbers', 'urls', 'organizations', 'memberships']
const labelsEnum = {
  address: ['Home', 'Work', 'Investment Property'],
  email: ['Personal', 'Work'],
  phone: ['Home', 'Mobile', 'Work', 'Fax', 'WhatsApp']
}


const parseAttributes = (key, conn, contactGroups) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'names' ) {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {

        const nameObj = {
          firstName: conn[key][i]['givenName'] || null,
          lastName: conn[key][i]['familyName'] || null,
          displayName: conn[key][i]['displayName'] || null,
          middleName: conn[key][i]['middleName'] || null,
          nickName: conn[key][i]['nickName'] || null
        }

        if (nameObj.firstName) {
          attributes.push({
            attribute_type: 'first_name',
            text: nameObj.firstName
          })
        }

        if (nameObj.lastName) {
          attributes.push({
            attribute_type: 'last_name',
            text: nameObj.lastName
          })
        }

        if (nameObj.middleName) {
          attributes.push({
            attribute_type: 'middle_name',
            text: nameObj.middleName
          })
        }
      }
    }
  }

  if ( key === 'nicknames' ) {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const nickName = conn[key][i]['value']

        if (nickName)
          attributes.push({ attribute_type: 'nickname', text: nickName })
      }
    }
  }

  if (key === 'coverPhotos') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const coverPhoto = conn[key][i]['url']

        if (coverPhoto)
          attributes.push({ attribute_type: 'cover_image_url', text: coverPhoto })
      }
    }
  }

  if (key === 'photos') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const photo = conn[key][i]['url']

        if (photo)
          attributes.push({ attribute_type: 'profile_image_url', text: photo })
      }
    }
  }

  if (key === 'birthdays') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const birthdayObj = conn[key][i]['date'] // { "year": 1988, "month": 8, "day": 10 }

        if (birthdayObj) {
          const birthday = new Date(birthdayObj.year, birthdayObj.month - 1, birthdayObj.day, 0, 0, 0)
  
          if (birthday)
            attributes.push({ attribute_type: 'birthday', date: birthday.getTime() / 1000 })
        }
      }
    }
  }

  if (key === 'urls') {
    for (let i = 0; i < conn[key].length; i++) {
      if ( conn[key][i]['metadata']['primary'] ) {
        if (conn[key][i]['metadata']['source']['type'] === 'CONTACT') {
          const website = conn[key][i]['value']

          if (website)
            attributes.push({ attribute_type: 'website', text: website })
        }
      }
    }
  }

  if (key === 'organizations') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const company = conn[key][i]['name']
        const jobTitle = conn[key][i]['title']

        if (company)
          attributes.push({ attribute_type: 'company', text: company })

        if (jobTitle)
          attributes.push({ attribute_type: 'job_title', text: jobTitle })
      }
    }
  }

  if (key === 'memberships') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['source']['type'] === 'CONTACT') {

        let text = conn[key][i]['contactGroupMembership']['contactGroupResourceName']

        if (contactGroups && text) {
          if (contactGroups[text])
            text = contactGroups[text]

          attributes.push({ attribute_type: 'tag', text: text })
          break
        }
      }
    }
  }

  if (key === 'addresses') {
    for (let i = 0; i < conn[key].length; i++) {
      const addressObj = {
        index: i + 1,
        formattedType: conn[key][i]['formattedType'], // Home, Work, Other, User-Custom-Type
        streetAddress: conn[key][i]['streetAddress'],
        extendedAddress: conn[key][i]['extendedAddress'],
        city: conn[key][i]['city'],
        postalCode: conn[key][i]['postalCode'],
        country: conn[key][i]['country']
      }

      let label = 'Other'
      if ( labelsEnum.address.includes(addressObj.formattedType) )
        label = addressObj.formattedType

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

      if (addressObj.city) {
        attributes.push({
          attribute_type: 'city',
          text: addressObj.city,
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

  if (key === 'emailAddresses') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['source']['type'] === 'CONTACT') {
        const emailObj = {
          formattedType: conn[key][i]['formattedType'], // Home, Work, Other, User-Custom-Type
          value: conn[key][i]['value']
        }

        let label = 'Other'
        if ( labelsEnum.email.includes(emailObj.formattedType) )
          label = emailObj.formattedType

        if (emailObj.value) {
          attributes.push({
            attribute_type: 'email',
            text: emailObj.value,
            label: label,
            is_primary: i === 0 ? true : false
          })
        }
      }
    }
  }

  if (key === 'phoneNumbers') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['source']['type'] === 'CONTACT') {
        const phoneObj = {
          formattedType: conn[key][i]['formattedType'], // Home, Work, Other, Mobile, Main, Home Fax, Work Fax, Google Voice, Pager, User-Custom-Type
          value: conn[key][i]['value']
        }

        let label = 'Other'
        if ( labelsEnum.phone.includes(phoneObj.formattedType) )
          label = phoneObj.formattedType

        if (phoneObj.value) {
          attributes.push({
            attribute_type: 'phone_number',
            text: phoneObj.value,
            label: label,
            is_primary: i === 0 ? true : false
          })
        }
      }
    }
  }

  return attributes
}

const syncContacts = async (google, data) => {
  const currentToken = data.googleCredential.contacts_sync_token
  const credentialId = data.googleCredential.id
  const user         = data.googleCredential.user
  const brand        = data.googleCredential.brand
  
  const records      = []
  const newContacts  = []

  try {

    const { connections, syncToken } = await google.listConnections(currentToken)

    const resourceNameArr     = connections.map(c => c.resourceName)
    const oldGoogleContacts   = await GoogleContact.getAll(resourceNameArr, credentialId)
    const oldGoogleContactIds = oldGoogleContacts.map(c => c.resource_name)
    const contactGroups       = await GoogleContact.getRefinedContactGroups(credentialId)

    for (const conn of connections) {
      // delete and update will be ignored
      if (conn.metadata.deleted)
        continue

      // upsert any contacts which fetched from google. (just update google_contats table)
      if ( !oldGoogleContactIds.includes(conn.resourceName) )
        records.push({ google_credential: credentialId, resource_name: conn.resourceName, meta: JSON.stringify(conn) })
    }

    const createdGoogleContacts = await GoogleContact.create(records)

    for (const createdGoogleContact of createdGoogleContacts) {

      /** @type {IContactInput} */
      const contact = {
        user: user,
        google_id: createdGoogleContact.id,
        attributes: [{ attribute_type: 'source_type', text: 'Google' }]
      }

      for (const key in createdGoogleContact.meta) {
        if (targetKeys.indexOf(key) >= 0) {
          const attributes = parseAttributes(key, createdGoogleContact.meta, contactGroups)
          contact.attributes = contact.attributes.concat(attributes)

          console.log(contact.attributes)
        }
      }

      if ( contact.attributes.length > 0 )
        newContacts.push(contact)
    }

    if (newContacts.length)
      await Contact.create(newContacts, user, brand, 'google_integration', { activity: false, relax: true, get: false })

    await GoogleCredential.updateContactsSyncToken(credentialId, syncToken)

    return  {
      syncToken: syncToken,
      status: true
    }

  } catch (ex) {

    return  {
      syncToken: null,
      status: false,
      ex: ex
    }
  }
}


module.exports = {
  syncContacts
}