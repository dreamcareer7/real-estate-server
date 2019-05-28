const GoogleCredential = require('../credential')
const GoogleContact    = require('../contact')
const GooglePlugin     = require('../plugin/googleapis.js')
const Contact          = require('../../Contact/index')
const AttributeDef     = require('../../Contact/attribute_def')

const _ = require('lodash')



let google

const setupClient = async (credential) => {
  if(google)
    return google

  google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}

const removeConnection = async (conn) => {
  const oldRecord = await GoogleContact.getByResourceName(conn.resourceName)

  if(oldRecord)
    await GoogleContact.delete(conn.resourceName)

  return true
}

const parseConnection = async (key, conn, user, defs_by_name) => {
  /*
    SELECT DISTINCT(name) FROM contacts_attribute_defs;

      first_name / middle_name / nickname / last_name / marketing_name
      profile_image_url / cover_image_url
      child_birthday / birthday / important_date
      street_suffix / city / county / unit_number / state / street_name / postal_code / country / street_prefix / street_number
      phone_number    
      company / job_title
      source / source_type
      wedding_anniversary / work_anniversary / home_anniversary
      linkedin / facebook / website / social /instagram
      last_modified_on_source
      Custom Attribute
      source_id    
      title
      email
      note
  */
 
  const attributes = []

  if( key === 'names' ) {
    for(let i=0; i<conn[key].length; i++) {
      if( conn[key][i]['metadata']['primary'] ) {
        const nameObj = {
          'firstName': conn[key][i]['givenName'] || null,
          'lastName': conn[key][i]['familyName'] || null,
          'displayName': conn[key][i]['displayName'] || null,
          'middleName': conn[key][i]['middleName'] || null,
          'nickName': conn[key][i]['nickName'] || null
        }

        if(nameObj['firstName']) {
          attributes.push({
            attribute_def: defs_by_name['first_name'].id,
            created_by: user,
            text: nameObj['firstName'],
            lable: '????',
            is_primary: true,
            is_partner: false
          })
        }

        if(nameObj['lastName']) {
          attributes.push({
            attribute_def: defs_by_name['last_name'].id,
            created_by: user,
            text: nameObj['lastName'],
            lable: '????',
            is_primary: false,
            is_partner: false
          })
        }

        if(nameObj['nickname']) {
          attributes.push({
            attribute_def: defs_by_name['nickname'].id,
            created_by: user,
            text: nameObj['nickname'],
            lable: '????',
            is_primary: false,
            is_partner: false
          })
        }

        if(nameObj['middleName']) {
          attributes.push({
            attribute_def: defs_by_name['middle_name'].id,
            created_by: user,
            text: nameObj['middleName'],
            lable: '????',
            is_primary: false,
            is_partner: false
          })
        }
      }
    }
  }

  if( key === 'coverPhotos' ) {
    for(let i=0; i<conn[key].length; i++) {
      if( conn[key][i]['metadata']['primary'] ) {
        const coverPhoto = conn[key][i]['url']

        attributes.push({
          attribute_def: defs_by_name['cover_image_url'].id,
          created_by: user,
          text: coverPhoto,
          lable: '????',
          is_primary: true,
          is_partner: false
        })
      }
    }
  }

  if( key === 'photos' ) {
    for(let i=0; i<conn[key].length; i++) {
      if( conn[key][i]['metadata']['primary'] ) {
        const photo = conn[key][i]['url']

        attributes.push({
          attribute_def: defs_by_name['profile_image_url'].id,
          created_by: user,
          text: photo,
          lable: '????',
          is_primary: true,
          is_partner: false
        })
      }
    }
  }

  if( key === 'birthdays' ) {
    for(let i=0; i<conn[key].length; i++) {
      if( conn[key][i]['metadata']['primary'] ) {
        const birthdayObj = conn[key][i]['date'] // { "year": 1988, "month": 8, "day": 10 }
        const birthday    = new Date()
        birthday.setFullYear(birthdayObj.year)
        birthday.setMonth(birthdayObj.month - 1)
        birthday.setDate(birthdayObj.day)

        attributes.push({
          attribute_def: defs_by_name['birthday'].id,
          created_by: user,
          text: birthday.toString(), // ???
          lable: '????',
          is_primary: true,
          is_partner: false
        })
      }
    }
  }

  if( key === 'addresses' ) {
    for(let i=0; i<conn[key].length; i++) {
      const addressObj = {
        'index': i+1,
        'type': conn[key][i]['formattedType'], // Home, Work, Other, User-Custom-Type
        'streetAddress': conn[key][i]['streetAddress'],
        'extendedAddress': conn[key][i]['extendedAddress'],
        'city': conn[key][i]['city'],
        'postalCode': conn[key][i]['postalCode'],
        'country': conn[key][i]['country']
      }

      attributes.push({
        attribute_def: defs_by_name['country'].id,
        created_by: user,
        text: addressObj['country'],
        index: i+1,
        lable: '????',
        is_primary: (i === 0) ? true : false,
        is_partner: false
      })

      attributes.push({
        attribute_def: defs_by_name['postal_code'].id,
        created_by: user,
        text: addressObj['postalCode'],
        index: i+1,
        lable: '????',
        is_primary: (i === 0) ? true : false,
        is_partner: false
      })

      attributes.push({
        attribute_def: defs_by_name['city'].id,
        created_by: user,
        text: addressObj['city'],
        index: i+1,
        lable: '????',
        is_primary: (i === 0) ? true : false,
        is_partner: false
      })

      attributes.push({
        attribute_def: defs_by_name['street_name'].id,
        created_by: user,
        text: addressObj['streetAddress'],
        index: i+1,
        lable: '????',
        is_primary: (i === 0) ? true : false,
        is_partner: false
      })

      attributes.push({
        attribute_def: defs_by_name['street_name'].id,
        created_by: user,
        text: addressObj['extendedAddress'],
        index: i+1,
        lable: '????',
        is_primary: (i === 0) ? true : false,
        is_partner: false
      })
    }
  }

  if( key === 'emailAddresses' ) {
    for(let i=0; i<conn[key].length; i++) {
      if( conn[key][i]['metadata']['source']['type'] === 'CONTACT' ) {
        const emailObj = {
          'type': conn[key][i]['formattedType'], // Home, Work, Other, User-Custom-Type
          'value': conn[key][i]['value']
        }

        attributes.push({
          attribute_def: defs_by_name['email'].id,
          created_by: user,
          text: emailObj['value'],
          lable: '????',
          is_primary: (i === 0) ? true : false,
          is_partner: false
        })
      }
    }
  }

  if( key === 'phoneNumbers' ) {
    for(let i=0; i<conn[key].length; i++) {
      if( conn[key][i]['metadata']['source']['type'] === 'CONTACT' ) {
        const phoneObj = {
          'type': conn[key][i]['formattedType'], // Home, Work, Other, Mobile, Main, Home Fax, Work Fax, Google Voice, Pager, User-Custom-Type
          'value': conn[key][i]['value']
        }

        attributes.push({
          attribute_def: defs_by_name['phone_number'].id,
          created_by: user,
          text: phoneObj['value'],
          lable: '????',
          is_primary: (i === 0) ? true : false,
          is_partner: false
        })
      }
    }
  }

  if( key === 'urls' ) {
    for(let i=0; i<conn[key].length; i++) {
      if( conn[key][i]['metadata']['source']['type'] === 'CONTACT' ) {
        const urlObj = {
          'type': conn[key][i]['formattedType'], // Profile, Blog, Work, Home Page User-Custom-Type
          'value': conn[key][i]['value']
        }

        attributes.push({
          attribute_def: defs_by_name['website'].id,
          created_by: user,
          text: urlObj['value'],
          lable: '????',
          is_primary: (i === 0) ? true : false,
          is_partner: false
        })
      }
    }
  }

  if( key === 'organizations' ) {
    for(let i=0; i<conn[key].length; i++) {
      if( conn[key][i]['metadata']['primary'] ) {
        const company = conn[key][i]['name']
        const jobTitle = conn[key][i]['title']

        attributes.push({
          attribute_def: defs_by_name['company'].id,
          created_by: user,
          text: company,
          lable: '????',
          is_primary: true,
          is_partner: false
        })

        attributes.push({
          attribute_def: defs_by_name['job_title'].id,
          created_by: user,
          text: jobTitle,
          lable: '????',
          is_primary: true,
          is_partner: false
        })
      }
    }
  }


  return attributes
}

// Goole Person Obj: https://developers.google.com/people/api/rest/v1/people
const syncContacts = async (data) => {
  const google = await setupClient(data.googleCredential)

  const currentToken = data.googleCredential.contacts_sync_token
  const credentialId = data.googleCredential.id
  const user         = data.googleCredential.user
  const brand        = data.googleCredential.brand

  const records    = []
  const contacts   = []
  const targetKeys = ['names', 'coverPhotos', 'photos', 'birthdays', 'emailAddresses', 'addresses', 'phoneNumbers', 'urls', 'organizations']

  // const { connections, syncToken } = await google.listConnections(currentToken)
  const connections = require('../../../../tests/unit/google/data/sample_person.json')
  const syncToken   = currentToken

  // Setup attribute_def required data
  const def_ids      = await AttributeDef.getForBrand(brand)
  const defs         = await AttributeDef.getAll(def_ids)

  const defs_by_id   = _.keyBy(defs, 'id')
  const defs_by_name = _.keyBy(defs, 'name')


  for(const conn of connections) {
    if( conn.metadata.deleted ) {
      await removeConnection(conn)

    } else {

      records.push({ google_credential: credentialId, resource_name: conn.resourceName, meta: JSON.stringify(conn) })

      const contact = { user: user, attributes: [] }

      for(const key in conn) {
        if(targetKeys.indexOf(key) >= 0) {
          const attributes   = await parseConnection(key, conn, user, defs_by_name)
          contact.attributes = contact.attributes.concat(attributes)
        }
      }

      if( contact.attributes.length > 0 )
        contacts.push(contact)
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