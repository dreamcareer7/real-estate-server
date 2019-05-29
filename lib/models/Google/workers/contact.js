const GoogleCredential = require('../credential')
const GoogleContact    = require('../contact')
const GooglePlugin     = require('../plugin/googleapis.js')
const AttributeDef     = require('../../Contact/attribute_def')
const Contact          = require('../../Contact/index')


let google

const setupClient = async credential => {
  if (google) return google

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

const removeConnection = async conn => {
  const oldRecord = await GoogleContact.get(conn.resourceName)

  if (oldRecord) {
    await GoogleContact.delete(conn.resourceName)
    // also delete it form rechat-contacts ???
  }

  return true
}

const parseConnection = async (key, conn, user) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if (key === 'names') {
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
            attribute_def: 'last_name',
            text: nameObj['lastName']
          })
        }

        if (nameObj['nickname']) {
          attributes.push({
            attribute_def: 'nickname',
            text: nameObj['nickname']
          })
        }

        if (nameObj['middleName']) {
          attributes.push({
            attribute_def: 'middle_name',
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
          attribute_def: 'cover_image_url',
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
          attribute_def: 'profile_image_url',
          text: photo
        })
      }
    }
  }

  if (key === 'birthdays') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const birthdayObj = conn[key][i]['date'] // { "year": 1988, "month": 8, "day": 10 }
        const birthday = new Date()
        birthday.setFullYear(birthdayObj.year)
        birthday.setMonth(birthdayObj.month - 1)
        birthday.setDate(birthdayObj.day)

        attributes.push({
          attribute_def: 'birthday',
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
        attribute_def: 'country',
        text: addressObj['country'],
        index: i + 1,
        is_primary: i === 0 ? true : false
      })

      attributes.push({
        attribute_def: 'postal_code',
        text: addressObj['postalCode'],
        index: i + 1,
        is_primary: i === 0 ? true : false
      })

      attributes.push({
        attribute_def: 'city',
        text: addressObj['city'],
        index: i + 1,
        is_primary: i === 0 ? true : false
      })

      attributes.push({
        attribute_def: 'street_name',
        text: addressObj['streetAddress'],
        index: i + 1,
        is_primary: i === 0 ? true : false
      })

      attributes.push({
        attribute_def: 'street_name',
        text: addressObj['extendedAddress'],
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
          attribute_def: 'email',
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
          attribute_def: 'phone_number',
          text: phoneObj['value'],
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  // just first reord ???
  if (key === 'urls') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['source']['type'] === 'CONTACT') {
        const urlObj = {
          type: conn[key][i]['formattedType'], // Profile, Blog, Work, Home Page User-Custom-Type
          value: conn[key][i]['value']
        }

        attributes.push({
          attribute_def: 'website',
          text: urlObj['value']
        })
      }
    }
  }

  if (key === 'organizations') {
    for (let i = 0; i < conn[key].length; i++) {
      if (conn[key][i]['metadata']['primary']) {
        const company = conn[key][i]['name']
        const jobTitle = conn[key][i]['title']

        attributes.push({
          attribute_def: 'company',
          text: company
        })

        attributes.push({
          attribute_def: 'job_title',
          text: jobTitle
        })
      }
    }
  }

  return attributes
}

// Goole Person Obj: https://developers.google.com/people/api/rest/v1/people
const syncContacts = async data => {
  const google = await setupClient(data.googleCredential)

  const currentToken = data.googleCredential.contacts_sync_token
  const credentialId = data.googleCredential.id
  const user = data.googleCredential.user
  const brand = data.googleCredential.brand

  const records = []
  const contacts = []
  const targetKeys = [
    'names',
    'coverPhotos',
    'photos',
    'birthdays',
    'emailAddresses',
    'addresses',
    'phoneNumbers',
    'urls',
    'organizations'
  ]

  // const { connections, syncToken } = await google.listConnections(currentToken)
  const connections = require('../../../../tests/unit/google/data/sample_person.json')
  const syncToken = currentToken

  for (const conn of connections) {
    if (conn.metadata.deleted) {
      await removeConnection(conn)
      // continue check-it-later
    } else {
      records.push({ id: conn.resourceName, google_credential: credentialId, meta: JSON.stringify(conn) })
      
      const oldRecord = await GoogleContact.get(conn.resourceName)

      if (!oldRecord) {
        const contact = { user: user, attributes: [] }
  
        for (const key in conn) {
          if (targetKeys.indexOf(key) >= 0) {
            const attributes = await parseConnection(key, conn, user)
            contact.attributes = contact.attributes.concat(attributes)
          }
        }
  
        if (contact.attributes.length > 0) contacts.push(contact)
      } else {
        // delete old google_contact record and insert new one ???
        // handle updated contact ???
      }
    }
  }

  // const res = await Contact.create(contacts, user, brand, { activity: false, relax: true, get: false })
  // console.log('\n------- Contacts:\n', res, '\n--------\n')

  await GoogleContact.create(records)
  await GoogleCredential.updateContactsSyncToken(credentialId, syncToken)

  return syncToken
}

module.exports = {
  syncContacts
}
