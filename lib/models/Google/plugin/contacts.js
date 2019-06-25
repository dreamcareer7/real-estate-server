// https://github.com/olalonde/Google-Contacts

const _     = require('lodash')
const qs    = require('querystring')
const fs    = require('fs').promises
const request = require('request-promise-native')



const GoogleContacts = {}

GoogleContacts.config = function (params) {
  this.contacts = []

  this.consumerKey    = params.consumerKey ? params.consumerKey : null
  this.consumerSecret = params.consumerSecret ? params.consumerSecret : null
  this.access_token   = params.access_token ? params.access_token : null
  this.refresh_token  = params.refresh_token ? params.refresh_token : null

  this.params = params
}

GoogleContacts.buildPath = function () {
  const params = GoogleContacts.params

  params.type           = params.type || 'contacts' // contacts, groups, photos/media
  params.alt            = params.alt || 'json'
  params.projection     = params.projection || 'full'
  params.email          = params.email || 'default'
  params['max-results'] = params['max-results'] || 100000

  let query = {
    alt: params.alt,
    group: 'http://www.google.com/m8/feeds/groups/saeed%40rechat.com/base/f'
  }

  // if(!params.id) query['max-results'] = params['max-results']
  query['max-results'] = params['max-results']

  if (params['updated-min'])
    query['updated-min'] = params['updated-min']

  if (params.q || params.query)
    query.q = params.q || params.query

  let path = '/m8/feeds/'

  path += params.type + '/'
  path += params.email + '/'
  path += params.projection
  
  if(params.id)
    path +=  '/'+ params.id
  
  path += '?' + qs.stringify(query)

  console.log(path)
  return path
}

GoogleContacts.saveContactsFromFeed = async function (feed) {
  const contacts = []

  for ( const entry of feed.entry ) {
    const url = _.get(entry, 'id.$t', '')

    console.log(entry)

    const contact = {
      id: null,
      photo: null,
      note: null,
      birthday: null,
      website: null,
      organization: {},
      names: {},
      addresses: [],
      emailes: [],
      phones: []
    }

    contact.id      = url.substring(_.lastIndexOf(url, '/') + 1)
    contact.note    = _.get(entry, 'content.$t')
    contact.website = _.get(entry, 'gContact$website.0.href')

    contact.organization['jobTitle'] = _.get(entry, 'gd$organization.0.gd$orgTitle.$t')
    contact.organization['company']  = _.get(entry, 'gd$organization.0.gd$orgName.$t')

    contact.names = {
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

    if (birthdayObj) {
      console.log(birthdayObj)
      const birthdayArr = entry['gContact$birthday']['when'].split('-')
      contact.birthday  = new Date(birthdayArr.year, birthdayArr.month - 1, birthdayArr.day, 0, 0, 0)
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
            index: i + 1,
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
  
          if ( addressesObj[i]['gd$postalCode'] )
            addresseObj['postalCode'] = addressesObj[i]['gd$postalCode']['$t']
  
          if ( addressesObj[i]['gd$country'] )
            addresseObj['country'] = addressesObj[i]['gd$country']['$t']
  
          contact.addresses.push(addresseObj)
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

          contact.emailes.push(emailObj)
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

          contact.phones.push(phoneObj)
        }
      }
    }

    if (links) {
      if ( links.length > 0 ) {
        for (let i = 0; i < links.length; i ++) {

          if ( links[i]['type'] === 'image/*' )
            contact.photo = links[i]['href']
        }
      }
    }

    contacts.push(contact)
  }

  return contacts
}

GoogleContacts.get = async function () {
  const path = GoogleContacts.buildPath()
  
  try {
    const responseString = await request.get({
      url: `https://www.google.com${path}`,
      headers: {
        'Authorization': 'OAuth ' + GoogleContacts.access_token,
        'GData-Version': 3
      }
    })

    // handle data.next
    const data = JSON.parse(responseString)

    return {
      data: data,
      err: null
    }

  } catch (ex) {
    
    const err = {
      statusCode: ex.statusCode,
      statusMessage: ex.response.statusMessage
    }

    return {
      data: null,
      err: err
    }
  }
}

GoogleContacts.getContactGroups = async function () {
  try {
    const responseString = await request.get({
      url: 'https://www.google.com/m8/feeds/groups/default/full?alt=json',
      headers: {
        'Authorization': 'OAuth ' + GoogleContacts.access_token,
        'GData-Version': 3
      }
    })

    console.log(responseString)

    // handle data.next
    const data = JSON.parse(responseString)

    if (!data)
      return { contactGroups: [], err: null }

    const feed  = data.feed || []
    const entry = data.feed.entry || []

    if (!entry.length)
    return { contactGroups: [], err: null }

    // const contacts = await GoogleContacts.saveContactsFromFeed(feed)
    // return {
    //   contactGroups: [],
    //   err: null
    // }

  } catch (ex) {
    
    console.log(ex)

    // const err = {
    //   statusCode: ex.statusCode,
    //   statusMessage: ex.response.statusMessage
    // }

    return {
      contactGroups: null,
      err: ex
    }
  }
}

GoogleContacts.getContacts = async function () {
  const { data, err } = await GoogleContacts.get()

  if (!data)
    return []

  const feed  = data.feed || []
  const entry = data.feed.entry || []

  if (!entry.length)
    return []

  const contacts = await GoogleContacts.saveContactsFromFeed(feed)

  return contacts
}

// contactId: 175684478ef6e8d0  filePath: 'logo.jpg'
GoogleContacts.getContactPhoto = async function (contactId, filePath) {
  const path = `/m8/feeds/photos/media/default/${contactId}`

  try {
    const imagedata = await request.get({
      url: `https://www.google.com${path}`,
      headers: {
        'Authorization': 'OAuth ' + GoogleContacts.access_token,
        'GData-Version': 3
      }
    })

    const file = await fs.readFile(filePath, imagedata, 'binary')

    return {
      file: file,
      err: null
    }

  } catch (ex) {

    console.log(ex)

    return {
      file: null,
      ex: ex
    }
  }
}



exports.GoogleContacts = GoogleContacts