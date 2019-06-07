const GoogleCredential = require('../credential')
const GoogleContact    = require('../contact')
const GooglePlugin     = require('../plugin/googleapis.js')
const Contact          = require('../../Contact/index')
const ContactAttribute = require('../../Contact/attribute')


const targetKeys = ['names', 'coverPhotos', 'photos', 'birthdays', 'emailAddresses', 'addresses', 'phoneNumbers', 'urls', 'organizations', 'memberships']

const singulars  = ['first_name', 'last_name', 'cover_image_url', 'profile_image_url', 'birthday', 'website', 'company', 'job_title', 'tag']
const multiples  = [ 'country', 'postal_code', 'city', 'street_name', 'email', 'phone_number']

const labelsEnum = {
  address: ['Home', 'Work', 'Investment Property'],
  email: ['Personal', 'Work'],
  phone: ['Home', 'Mobile', 'Work', 'Fax', 'WhatsApp']
}


let google

const setupClient = async (credential) => {
  if (google)
    return google

  google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async tokens => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}

const removeConnection = async (brand, user, conn) => {
  const record = await GoogleContact.get(conn.resourceName)

  if (record) {
    const result         = await Contact.filter(brand, [], { google_id: conn.resourceName })
    const currentContact = await Contact.get(result.ids[0])
    const toDeleteAtts   = await ContactAttribute.getForContacts([currentContact.id])
    
    const ids = toDeleteAtts.map(a => a.id)

    await GoogleContact.delete(conn.resourceName)
    await ContactAttribute.delete(ids, user)
    await Contact.delete([currentContact.id], user)
  }

  return true
}

const parseNoneSingularAtts = (key, conn) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

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

const parseSingularAtts = (key, conn, contactGroups) => {
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

        if (nameObj.nickname) {
          attributes.push({
            attribute_type: 'nickname',
            text: nameObj.nickname
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

  return attributes
}

const getSingularAttribute = (attributes, attribute_type) => {
  let target = null

  for (const att of attributes) {
    if ( att.attribute_type === attribute_type) {
      target = att
      break
    }
  }

  return target
}

const updateRechatContact = async (user, brand, conn, contactGroups) => {
  let googleAttributes      = []
  let newAttributes         = []
  const updatedAttributes   = []
  const deletedAttributeIds = []

  const result         = await Contact.filter(brand, [], { google_id: conn.resourceName })
  const currentContact = await Contact.get(result.ids[0])
  const oldAttributes  = await ContactAttribute.getForContacts([currentContact.id])

  oldAttributes.forEach(function(oldAttribute) {
    if ( multiples.includes(oldAttribute.attribute_type) )
      deletedAttributeIds.push(oldAttribute.id)
  })

  for (const key in conn) {
    if (targetKeys.indexOf(key) >= 0) {
      const attributes = parseSingularAtts(key, conn, contactGroups)
      googleAttributes = googleAttributes.concat(attributes)

      const noneSingularAtts = parseNoneSingularAtts(key, conn)
      newAttributes = newAttributes.concat(noneSingularAtts)
    }
  }

  const localGetSingularOldAttribute = (attribute_type) => {
    return getSingularAttribute(oldAttributes, attribute_type)
  }

  const localGetSingularGoogleAttribute = (attribute_type) => {
    return getSingularAttribute(googleAttributes, attribute_type)
  }

  for (const oldAttribute of oldAttributes) {
    for (const keyWord of singulars) {
      if ( oldAttribute.attribute_type === keyWord ) {
        const googleAttribute = localGetSingularGoogleAttribute(keyWord)

        if (keyWord === 'birthday') {

          if ( !googleAttribute || !googleAttribute.date )
            deletedAttributeIds.push(oldAttribute.id)

        } else {

          if ( !googleAttribute || !googleAttribute.text )
            deletedAttributeIds.push(oldAttribute.id)
        }
      }
    }
  }

  for (const googleAttribute of googleAttributes) {
    for (const keyWord of singulars) {
      if ( googleAttribute.attribute_type === keyWord ) {
        const oldAttribute = localGetSingularOldAttribute(keyWord)

        if (keyWord === 'birthday') {

          if (!oldAttribute) {

            newAttributes.push({
              attribute_type: keyWord,
              date: googleAttribute.date
            })

          } else if ( oldAttribute.date !== googleAttribute.date ) {

            if (googleAttribute.date) {
              updatedAttributes.push({
                id: oldAttribute.id,
                attribute_type: keyWord,
                date: googleAttribute.date
              })
            }
          }

        } else {

          if (!oldAttribute) {
            newAttributes.push({
              attribute_type: keyWord,
              text: googleAttribute.text
            })

          } else if ( oldAttribute.text !== googleAttribute.text ) {

            if (googleAttribute.text) {
              updatedAttributes.push({
                id: oldAttribute.id,
                attribute_type: keyWord,
                text: googleAttribute.text
              })
            }
          }
        }
      }
    }
  }

  if (deletedAttributeIds.length > 0)
    await ContactAttribute.delete(deletedAttributeIds, user)

  if (updatedAttributes.length > 0) {
    const updated_contact = { id: currentContact.id, attributes: updatedAttributes }
    await Contact.update(user, brand, [updated_contact])
  }

  if (newAttributes.length > 0) {
    const new_contact = { id: currentContact.id, attributes: newAttributes }
    await Contact.update(user, brand, [new_contact])
  }
}

const syncContacts = async (data) => {
  const currentToken = data.googleCredential.contacts_sync_token
  const credentialId = data.googleCredential.id
  const user         = data.googleCredential.user
  const brand        = data.googleCredential.brand
  
  const records      = []
  const newContacts  = []
  
  // in google people api => each connection is a unique contact record
  const google = await setupClient(data.googleCredential)
  const { connections, syncToken } = await google.listConnections(currentToken)

  const resourceNameArr     = connections.map(c => c.resourceName)
  const oldGoogleContacts   = await GoogleContact.getAll(resourceNameArr)
  const oldGoogleContactIds = oldGoogleContacts.map(c => c.id)
  const contactGroups       = await GoogleContact.getRefinedContactGroups(credentialId)

  for (const conn of connections) {
    if ( conn.metadata.deleted ) {
      await removeConnection(brand, user, conn)
      continue
    }

    // upsert any contacts which fetched from google. (just update google_contats table)
    records.push({ id: conn.resourceName, google_credential: credentialId, meta: JSON.stringify(conn) })
    
    // if oldGoogleContactIds.indexOf(conn.resourceName) >= 0 ==> it means this is a updated contact which has fetched from google
    if ( !oldGoogleContactIds.includes(conn.resourceName) ) {
      const contact = { user: user, google_id: conn.resourceName, attributes: [{ attribute_type: 'source_type', text: 'Google' }] }

      for (const key in conn) {
        if (targetKeys.indexOf(key) >= 0) {
          const singularAtts = parseSingularAtts(key, conn, contactGroups)
          contact.attributes = contact.attributes.concat(singularAtts)

          const noneSingularAtts = parseNoneSingularAtts(key, conn, contactGroups)
          contact.attributes     = contact.attributes.concat(noneSingularAtts)
        }
      }

      if ( contact.attributes.length > 0 )
        newContacts.push(contact)

    } else {

      // sync rechat-contact(contactObj) by google-contact if rechat-contact is not updated after first-sync
      const result     = await Contact.filter(brand, [], { google_id: conn.resourceName })
      const contactObj = await Contact.get(result.ids[0])

      const gap = Math.abs(Math.floor(contactObj.created_at) - Math.floor(contactObj.updated_at))

      if ( gap < 2 && (contactObj.deleted_at === null) )
        await updateRechatContact(user, brand, conn, contactGroups)
    }
  }

  await GoogleContact.create(records)
  await GoogleCredential.updateContactsSyncToken(credentialId, syncToken)
  await Contact.create(newContacts, user, brand, { activity: false, relax: true, get: false })

  return syncToken
}


module.exports = {
  syncContacts
}