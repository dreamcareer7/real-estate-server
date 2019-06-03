const GoogleCredential = require('../credential')
const GoogleContact    = require('../contact')
const GooglePlugin     = require('../plugin/googleapis.js')
const Contact          = require('../../Contact/index')
const ContactAttribute = require('../../Contact/attribute')


// switch to dynamic mode
const targetKeys = ['names', 'coverPhotos', 'photos', 'birthdays', 'emailAddresses', 'addresses', 'phoneNumbers', 'urls', 'organizations']
const singulars  = ['first_name', 'last_name', 'cover_image_url', 'profile_image_url', 'birthday', 'website', 'company', 'job_title'] 
const multiples  = [ 'country', 'postal_code', 'city', 'street_name', 'email', 'phone_number']

let google

const setupClient = async (credential) => {
  if(google)
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

const removeConnection = async (conn) => {
  const record = await GoogleContact.get(conn.resourceName)

  if(record) {
    await GoogleContact.delete(conn.resourceName)
    // also delete it form rechat-contacts ???
  }

  return true
}

const parseConnection = async (key, conn) => {
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

        if (nameObj['firstName']) {
          attributes.push({
            attribute_type: 'first_name',
            text: nameObj['firstName']
          })
        }

        if (nameObj['lastName']) {
          attributes.push({
            attribute_type: 'last_name',
            text: nameObj['lastName']
          })
        }

        if (nameObj['nickname']) {
          attributes.push({
            attribute_type: 'nickname',
            text: nameObj['nickname']
          })
        }

        if (nameObj['middleName']) {
          attributes.push({
            attribute_type: 'middle_name',
            text: nameObj['middleName']
          })
        }
      }
    }
  }

  if (key === 'coverPhotos') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const coverPhoto = conn[key][i]['url']

        attributes.push({
          attribute_type: 'cover_image_url',
          text: coverPhoto
        })
      }
    }
  }

  if (key === 'photos') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const photo = conn[key][i]['url']

        attributes.push({
          attribute_type: 'profile_image_url',
          text: photo
        })
      }
    }
  }

  if (key === 'birthdays') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const birthdayObj = conn[key][i]['date'] // { "year": 1988, "month": 8, "day": 10 }
        const birthday    = new Date(birthdayObj.year, birthdayObj.month - 1, birthdayObj.day, 0, 0, 0)

        attributes.push({
          attribute_type: 'birthday',
          date: birthday.getTime() / 1000
        })
      }
    }
  }

  if (key === 'addresses') {
    for (let i = 0; i < conn[key].length; i++) {
      const addressObj = {
        index: i + 1,
        type: conn[key][i]['formattedType'], // Home, Work, Other, User-Custom-Type
        streetAddress: conn[key][i]['streetAddress'],
        extendedAddress: conn[key][i]['extendedAddress'],
        city: conn[key][i]['city'],
        postalCode: conn[key][i]['postalCode'],
        country: conn[key][i]['country']
      }

      attributes.push({
        attribute_type: 'country',
        text: addressObj['country'],
        index: i + 1,
        is_primary: i === 0 ? true : false
      })

      attributes.push({
        attribute_type: 'postal_code',
        text: addressObj['postalCode'],
        index: i + 1,
        is_primary: i === 0 ? true : false
      })

      attributes.push({
        attribute_type: 'city',
        text: addressObj['city'],
        index: i + 1,
        is_primary: i === 0 ? true : false
      })

      attributes.push({
        attribute_type: 'street_name',
        text: addressObj['streetAddress'],
        index: i + 1,
        is_primary: i === 0 ? true : false
      })
    }
  }

  if (key === 'emailAddresses') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['source']['type'] === 'CONTACT') {
        const emailObj = {
          type: conn[key][i]['formattedType'], // Home, Work, Other, User-Custom-Type
          value: conn[key][i]['value']
        }

        attributes.push({
          attribute_type: 'email',
          text: emailObj['value'],
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  if (key === 'phoneNumbers') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['source']['type'] === 'CONTACT') {
        const phoneObj = {
          type: conn[key][i]['formattedType'], // Home, Work, Other, Mobile, Main, Home Fax, Work Fax, Google Voice, Pager, User-Custom-Type
          value: conn[key][i]['value']
        }

        attributes.push({
          attribute_type: 'phone_number',
          text: phoneObj['value'],
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  if (key === 'urls') {
    for (let i = 0; i < conn[key].length; i++) {
      if ( conn[key][i]['metadata']['primary'] ) {
        if (conn[key][i]['metadata']['source']['type'] === 'CONTACT') {
          const urlObj = {
            type: conn[key][i]['formattedType'], // Profile, Blog, Work, Home Page User-Custom-Type
            value: conn[key][i]['value']
          }
  
          attributes.push({
            attribute_type: 'website',
            text: urlObj['value']
          })
        }
      }
    }
  }

  if (key === 'organizations') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const company = conn[key][i]['name']
        const jobTitle = conn[key][i]['title']

        attributes.push({
          attribute_type: 'company',
          text: company
        })

        attributes.push({
          attribute_type: 'job_title',
          text: jobTitle
        })
      }
    }
  }

  return attributes
}

const getSingularAttribute = (attributes, attribute_type) => {
  let target = null

  for (const att of attributes) {
    if ( att['attribute_type'] === attribute_type) {
      target = att
      break
    }
  }

  return target
}

const getMultipleAttribute = (attributes, attribute_type) => {
  const targets = []

  for (const att of attributes) {
    if ( att['attribute_type'] === attribute_type) {
      targets.push(att.text)
    }
  }

  return targets
}

const updateRechatContact = async (user, brand, conn) => {
  let googleAttributes      = []
  const newAttributes       = []
  const updatedAttributes   = []
  const deletedAttributeIds = []

  const result         = await Contact.filter(brand, [], { google_id: conn.resourceName })
  const currentContact = await Contact.get(result.ids[0])
  const oldAttributes  = await ContactAttribute.getForContacts([currentContact.id])

  for (const key in conn) {
    if (targetKeys.indexOf(key) >= 0) {
      const attributes = await parseConnection(key, conn)
      googleAttributes = googleAttributes.concat(attributes)
    }
  }

  const localGetSingularOldAttribute = (attribute_type) => {
    return getSingularAttribute(oldAttributes, attribute_type)
  }

  const localGetSingularGoogleAttribute = (attribute_type) => {
    return getSingularAttribute(googleAttributes, attribute_type)
  }

  const localGetMultipleOldAttribute = (attribute_type) => {
    return getMultipleAttribute(oldAttributes, attribute_type)
  }

  const localGetMultipleGoogleAttribute = (attribute_type) => {
    return getMultipleAttribute(googleAttributes, attribute_type)
  }

  for (const oldAttribute of oldAttributes) {
    for (const keyWord of singulars) {
      if ( oldAttribute['attribute_type'] === keyWord ) { // use .
        const googleAttribute = localGetSingularGoogleAttribute(keyWord)

        if (!googleAttribute)
          deletedAttributeIds.push(oldAttribute.id)

        continue
      }      
    }

    for (const keyWord of multiples) {
      if ( oldAttribute['attribute_type'] === keyWord ) {
        const googleAttributesArr = localGetMultipleGoogleAttribute(keyWord)

        if ( googleAttributesArr.indexOf(oldAttribute['text']) < 0 )
          deletedAttributeIds.push(oldAttribute.id)
      }
    }
  }

  // label ????
  for (const googleAttribute of googleAttributes) {
    for (const keyWord of singulars) {
      if ( googleAttribute['attribute_type'] === keyWord ) {
        const oldAttribute = localGetSingularOldAttribute(keyWord)

        if (keyWord === 'birthday') {

          if (!oldAttribute) {
            newAttributes.push({
              attribute_type: keyWord,
              date: googleAttribute['date']
            })

            continue
          }

          if ( oldAttribute.date === googleAttribute['date'] )
            continue

          if ( oldAttribute.date !== googleAttribute['date'] ) {
            console.log(oldAttribute.date , googleAttribute['date'])

            updatedAttributes.push({
              id: oldAttribute.id,
              attribute_type: keyWord,
              date: googleAttribute['date']
            })

            continue
          }

        } else {

          if (!oldAttribute) {
            newAttributes.push({
              attribute_type: keyWord,
              text: googleAttribute['text']
            })

            continue
          }

          if ( oldAttribute.text === googleAttribute['text'] )
            continue

          if ( oldAttribute.text !== googleAttribute['text'] ) {
            updatedAttributes.push({
              id: oldAttribute.id,
              attribute_type: keyWord,
              text: googleAttribute['text']
            })

            continue
          }
        }
      }
    }

    for (const keyWord of multiples) {
      if ( googleAttribute['attribute_type'] === keyWord ) {
        const oldAttributesArr = localGetMultipleOldAttribute(keyWord)

        if ( oldAttributesArr.indexOf(googleAttribute['text']) < 0 ) {
          newAttributes.push({
            attribute_type: keyWord,
            text: googleAttribute['text']
          })

          continue
        }

        if ( oldAttributesArr.indexOf(googleAttribute['text']) >= 0 )
          continue
      }
    }
  }


  // console.log('\n\nupdatedAttributes:', updatedAttributes)
  // console.log('\n\ndeletedAttributeIds:', deletedAttributeIds)
  // console.log('\n\nnewAttributes:', newAttributes)

  if (updatedAttributes.length > 0) {
    const updated_contact = { id: currentContact.id, attributes: updatedAttributes }
    await Contact.update(user, brand, [updated_contact])
  }

  if (newAttributes.length > 0)
    await Contact.update(user, brand, [newAttributes])

  if (deletedAttributeIds.length > 0)
    await ContactAttribute.delete(deletedAttributeIds, user)
}


// Goole Person Obj: https://developers.google.com/people/api/rest/v1/people
const syncContacts = async data => {
  const google = await setupClient(data.googleCredential)

  const currentToken = data.googleCredential.contacts_sync_token
  const credentialId = data.googleCredential.id
  const user         = data.googleCredential.user
  const brand        = data.googleCredential.brand

  const records    = []
  const contacts   = []

  // const { connections, syncToken } = await google.listConnections(currentToken)
  const connections = require('../../../../tests/unit/google/data/sample-data/contact/person.json')
  const syncToken   = currentToken


  // connections.map(c => c.resourceName)

  for (const conn of connections) {
    if ( conn.metadata.deleted ) {
      await removeConnection(conn)
      continue
    }

    // upsert any contacts which fetched from google. (just update google_contats table)
    records.push({ id: conn.resourceName, google_credential: credentialId, meta: JSON.stringify(conn) })
    
    let oldGoogleContact
    try {
      oldGoogleContact = await GoogleContact.get(conn.resourceName)
    } catch (ex) {
      // do noting
    }

    // if oldGoogleContact is true ==> it means this is a updated contact which has fetched from google
    if (!oldGoogleContact) {
      const contact = { user: user, google_id: conn.resourceName, attributes: [] }

      for (const key in conn) {
        if (targetKeys.indexOf(key) >= 0) {
          const attributes   = await parseConnection(key, conn)
          contact.attributes = contact.attributes.concat(attributes)
        }
      }

      if ( contact.attributes.length > 0 )
        contacts.push(contact)

    } else {

      // sync rechat-contact(contactObj) by google-contact if rechat-contact is not updated after first-sync
      const result     = await Contact.filter(brand, [], { google_id: conn.resourceName })
      const contactObj = await Contact.get(result.ids[0])

      // *** refactor condition
      if ( (Math.trunc(contactObj.created_at) !== Math.trunc(contactObj.updated_at)) || (contactObj.deleted_at !== null) )
        await updateRechatContact(user, brand, conn)
    }
  }

  await GoogleContact.create(records)
  await GoogleCredential.updateContactsSyncToken(credentialId, syncToken)
  await Contact.create(contacts, user, brand, { activity: false, relax: true, get: false })
  
  // next two lines are for test, will be removed in production
  if (contacts.length)
    await updateRechatContact(user, brand, connections[0]) 

  return syncToken
}

module.exports = {
  syncContacts
}
