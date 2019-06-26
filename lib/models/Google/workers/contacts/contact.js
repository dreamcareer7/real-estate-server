const _  = require('lodash')
const qs = require('querystring')

const AttachedFile     = require('../../../AttachedFile')
const GoogleCredential = require('../../credential')
const GoogleContact    = require('../../contact')
const Contact          = require('../../../Contact/index')


const targetKeys = ['names', 'note', 'photo', 'website', 'organization', 'groupMembership', 'addresses', 'emailes', 'phones']


const parseAttributes = (key, entry, contactGroups) => {
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
    if ( contactGroups && entry.groupMembership ) {
      if (contactGroups[entry.groupMembership])
        attributes.push({ attribute_type: 'tag', text: contactGroups[entry.groupMembership] })
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

const parseFeed = (entries) => {
  const connections = []

  for ( const entry of entries ) {
    const url = _.get(entry, 'id.$t', '')

    const conn = {
      entry_id: null,
      photo: null,
      note: null,
      birthday: null,
      website: null,
      groupMembership: null,
      organization: {},
      names: {},
      addresses: [],
      emailes: [],
      phones: []
    }

    conn.entry_id = url.substring(_.lastIndexOf(url, '/') + 1)
    conn.note     = _.get(entry, 'content.$t')
    conn.website  = _.get(entry, 'gContact$website.0.href')

    conn.organization['jobTitle'] = _.get(entry, 'gd$organization.0.gd$orgTitle.$t')
    conn.organization['company']  = _.get(entry, 'gd$organization.0.gd$orgName.$t')

    conn.names = {
      name: _.get(entry, 'title.$t'), // title
      givenName: _.get(entry, 'gd$name.gd$givenName.$t'),
      familyName: _.get(entry, 'gd$name.gd$familyName.$t'),
      additionalName: _.get(entry, 'gd$name.gd$additionalName.$t'), // middlename
      fullName: _.get(entry, 'gd$name.gd$fullName.$t'), // displayName
      nickName: _.get(entry, 'gContact$nickname.$t')
    }

    const birthdayObj  = _.get(entry, 'gContact$birthday.$when')
    const addressesObj = _.get(entry, 'gd$structuredPostalAddress')
    const emailesObj   = _.get(entry, 'gd$email')
    const phonesObj    = _.get(entry, 'gd$phoneNumber')
    const links        = _.get(entry, 'link')
    const memberships  = _.get(entry, 'gContact$groupMembershipInfo')

    if (birthdayObj) {
      const birthdayArr = entry['gContact$birthday']['when'].split('-')
      conn.birthday  = new Date(birthdayArr.year, birthdayArr.month - 1, birthdayArr.day, 0, 0, 0)
    }

    if (addressesObj) {
      if ( addressesObj.length > 0 ) {
        for (let i = 0; i < addressesObj.length; i ++) {
  
          let label = addressesObj[i]['label']
  
          if (!label) {
            const labelString = addressesObj[i]['rel']
            const arr = labelString.split('#')
            if (arr[1])
              label = arr[1]
          }
  
          const addresseObj = {
            label: label
          }
  
          if ( addressesObj[i]['gd$formattedAddress'] )
            addresseObj['formatted'] = addressesObj[i]['gd$formattedAddress']['$t']
  
          if ( addressesObj[i]['gd$street'] )
            addresseObj['streetAddress'] = addressesObj[i]['gd$street']['$t']
  
          if ( addressesObj[i]['gd$neighborhood'] )
            addresseObj['extendedAddress'] = addressesObj[i]['gd$neighborhood']['$t']
  
          if ( addressesObj[i]['gd$city'] )
            addresseObj['city'] = addressesObj[i]['gd$city']['$t']
  
          if ( addressesObj[i]['gd$postcode'] )
            addresseObj['postalCode'] = addressesObj[i]['gd$postcode']['$t']
  
          if ( addressesObj[i]['gd$country'] )
            addresseObj['country'] = addressesObj[i]['gd$country']['$t']
  
          conn.addresses.push(addresseObj)
        }
      }
    }

    if (emailesObj) {
      if ( emailesObj.length > 0 ) {
        for (let i = 0; i < emailesObj.length; i ++) {

          let label = emailesObj[i]['label']

          if (!label) {
            const labelString = emailesObj[i]['rel']
            const arr = labelString.split('#')
            if (arr[1])
              label = arr[1]
          }

          const emailObj = {
            label: label,
            address: emailesObj[i]['address']
          }

          conn.emailes.push(emailObj)
        }
      }
    }

    if (phonesObj) {
      if ( phonesObj.length > 0 ) {
        for (let i = 0; i < phonesObj.length; i ++) {

          let label = phonesObj[i]['label']

          if (!label) {
            const labelString = phonesObj[i]['rel']
            const arr = labelString.split('#')
            if (arr[1])
              label = arr[1]
          }

          const phoneObj = {
            label: label,
            phoneNumber: phonesObj[i]['$t']
          }

          conn.phones.push(phoneObj)
        }
      }
    }

    if (links) {
      if ( links.length > 0 ) {
        for (let i = 0; i < links.length; i ++) {

          if ( links[i]['type'] === 'image/*' )
            conn.photo = links[i]['href']
        }
      }
    }

    if (memberships) {
      if ( memberships.length > 0 ) {
        for (let i = 0; i < memberships.length; i ++) {

          if ( memberships[i]['deleted'] === 'false' || memberships[i]['deleted'] === false )
            conn.groupMembership = memberships[i]['href']
        }
      }
    }

    if (conn.entry_id)
      connections.push(conn)
  }

  return connections
}

const extractPhoto = async (google, user, conn) => {
  try {
    const imagedata = await google.getContactPhoto(conn.photo)

    // const saved = await AttachedFile.saveFromBuffer({
    //   filename: `google_cover_${conn.entry_id}.jpg`,
    //   relations: [],
    //   path: `google_covers`,
    //   user,
    //   public: false,
    //   buffer: imagedata
    // })
  
    // console.log(saved)

  } catch (ex) {

    // do nothing
    // ex.response.body: "Photo not found"
  }

  return true
}

const buildPath = (lastSyncAt) => {
  // lastSyncAt = new Date(lastSyncAt)
  // lastSyncAt.setHours(lastSyncAt.getHours() - 2)

  let query = {
    'alt': 'json',
    'showdeleted': false,
    'max-results': 2000,
    'updated-min': new Date(lastSyncAt).toISOString()
    // group: 'http://www.google.com/m8/feeds/groups/saeed%40rechat.com/base/f'
    // q: ''
  }

  const path = `/m8/feeds/contacts/default/full?${qs.stringify(query)}`

  return path
}

const syncContacts = async (google, data) => {
  const lastSyncAt   = data.googleCredential.contacts_last_sync_at || data.googleCredential.last_sync_at
  const credentialId = data.googleCredential.id
  const user         = data.googleCredential.user
  const brand        = data.googleCredential.brand
  
  const records      = []
  const newContacts  = []

  try {

    const path = buildPath(lastSyncAt)

    const entries = await google.getContacts(path)

    if (!entries.length)
      return { status: true }
  
    const connections = await parseFeed(entries)

    const entryIdsArr              = connections.map(c => c.entry_id)
    const oldGoogleContacts        = await GoogleContact.getAll(entryIdsArr, credentialId)
    const oldGoogleContactEntryIds = oldGoogleContacts.map(c => c.entry_id)
    const contactGroups            = await GoogleContact.getRefinedContactGroups(credentialId)

    for (const conn of connections) {
      if ( !oldGoogleContactEntryIds.includes(conn.entry_id) )
        records.push({ google_credential: credentialId, entry_id: conn.entry_id, entry: JSON.stringify(conn) })
    }

    // console.log('connections.length', connections.length)
    // console.log('entryIdsArr.length', entryIdsArr.length)
    // console.log('oldGoogleContacts.length', oldGoogleContacts.length)
    // console.log('oldGoogleContactEntryIds.length', oldGoogleContactEntryIds.length)
    // console.log('records.length', records.length)

    const createdGoogleContacts = await GoogleContact.create(records)

    for (const contact of createdGoogleContacts) {
      if (!contact.photo)
        continue

      await extractPhoto(google, user, contact.entry)
    }
  
    for (const createdGoogleContact of createdGoogleContacts) {

      /** @type {IContactInput} */
      const contact = {
        user: user,
        google_id: createdGoogleContact.id,
        attributes: [{ attribute_type: 'source_type', text: 'Google' }]
      }

      for (const key in createdGoogleContact.entry) {
        if (targetKeys.indexOf(key) >= 0) {
          const attributes = parseAttributes(key, createdGoogleContact.entry, contactGroups)
          contact.attributes = contact.attributes.concat(attributes)
        }
      }

      if ( contact.attributes.length > 0 )
        newContacts.push(contact)
    }

    // console.log('createdGoogleContacts.length', createdGoogleContacts.length)
    // console.log('newContacts.length', newContacts.length)

    if (newContacts.length)
      await Contact.create(newContacts, user, brand, 'google_integration', { activity: false, relax: true, get: false })

    await GoogleCredential.updateContactsLastSyncAt(credentialId)

    return {
      status: true
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