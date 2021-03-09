const config   = require('../../../../../../config')
const Context  = require('../../../../../Context')
const Slack    = require('../../../../../Slack')
const channel  = config.google_integration.slack_channel


function sendSlackMsg (text) {
  const emoji = ':skull:'

  Slack.send({ channel, text, emoji })
}

const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date)
}

const contacts = {
  getEntryId: (metadata) => {
    if ( metadata?.objectType !== 'PERSON' ) {
      return null
    }
  
    const result = metadata.sources.filter(source => (source.type === 'CONTACT')).map(source => source.id)
    return result[0]
  },

  getNames: (names) => {
    const result = names.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => {
      return {
        displayName: record.displayName,
        fullName: record.displayName,
        familyName: record.familyName,
        givenName: record.givenName,
        middleName: record.middleName,
        honorificPrefix: record.honorificPrefix,
      }
    })
  
    return result[0]
  },

  getNickname: (nicknames) => {
    const result = nicknames.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.value)
    return result[0]
  },

  getPhoto: (photos) => {
    const result = photos.filter(record => (record?.metadata?.primary && !record.default)).map(record => record.url)
    return result[0]
  },

  getBirthday: (birthdays) => {
    const textArr = birthdays.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.text)

    if ( isValidDate(new Date(textArr[0])) ) {
      return textArr[0]
    }

    const dateArr = birthdays.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.date)
    
    if ( !dateArr[0]?.month || !dateArr[0]?.day || !dateArr[0]?.year ) {
      return null
    }
    
    const temp = `${dateArr[0].month}/${dateArr[0].day}/${dateArr[0].year}`

    if ( isValidDate(new Date(temp)) ) {
      return temp
    }

    return null
  },

  getWebsite: (urls) => {
    const result = urls.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.value)
    return result[0]
  },

  getOrganization: (organizations) => {
    const result = organizations.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => {
      return {
        jobTitle: record.title,
        company: record.name
      }
    })
  
    return result[0]
  },

  getNote: (biographies) => {
    const result = biographies.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.value)
    return result[0]
  },

  getPhones: (phoneNumbers) => {
    const result = phoneNumbers.filter(record => record?.metadata?.source?.type === 'CONTACT').map(record => {
      return {
        value: record.value,
        type: record.type
      }
    })
  
    return result
  },

  getEmails: (emailAddresses) => {
    const result = emailAddresses.filter(record => record?.metadata?.source?.type === 'CONTACT').map(record => {
      return {
        value: record.value,
        type: record.type
      }
    })
  
    return result
  },

  getAddresses: (addresses) => {
    const result = addresses.filter(record => record?.metadata?.source?.type === 'CONTACT').map(record => {
      return {
        streetAddress: record.streetAddress,
        extendedAddress: record.extendedAddress,
        city: record.city,
        postalCode: record.postalCode,
        country: record.country,
        countryCode: record.countryCode,
        state: record.region,
        type: record.type
      }
    })
  
    return result
  },

  getMemberships: (memberships) => {
    const result = memberships.filter(record => record?.metadata?.source?.type === 'CONTACT').map(record => {
      return record.contactGroupMembership
    })
  
    return result
  }
}

const otherContacts = {
  getEntryId: (metadata) => {
    if ( metadata?.objectType !== 'PERSON' ) {
      return null
    }
  
    const result = metadata.sources.filter(source => (source.type === 'OTHER_CONTACT')).map(source => source.id)
    return result[0]
  },

  getNames: (names) => {
    const result = names.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'OTHER_CONTACT')).map(record => {
      return {
        displayName: record.displayName,
        fullName: record.displayName,
        familyName: record.familyName,
        givenName: record.givenName,
        middleName: null
      }
    })
  
    return result[0]
  },

  getPhones: (phoneNumbers) => {
    const result = phoneNumbers.filter(record => record?.metadata?.source?.type === 'OTHER_CONTACT').map(record => {
      return {
        value: record.value,
        type: record.type
      }
    })
  
    return result
  },

  getEmails: (emailAddresses) => {
    const result = emailAddresses.filter(record => record?.metadata?.source?.type === 'OTHER_CONTACT').map(record => {
      return {
        value: record.value,
        type: record.type
      }
    })
  
    return result
  }
}


const refineConnections = (connections) => {
  /*
    Configuring the quta:
    https://console.cloud.google.com/apis/api/people.googleapis.com/quotas?authuser=1&folder=&organizationId=&project=rechat-bagot&supportedpurview=project
  */

  /*
    Google To Rechat: If connections have been coming directly from Google, there should not be any kind of error in records.
    Rechat To Google: If we have sent a request to Google to create/update/delete some contacts, there might be a few errors in the responded records.

    A special scenario:
    1- User had synced his account/contacts
    2- User has recently disconnected his account and deleted a few of his contacts on the Google-Contacts-Web-App
    3- User reconnects his account again but we can not easily list those already deleted contacts
    4- User updates one of the deleted contacts
    5- The Rechat-To-Google sync process is going to reflect this very update on Google
    6- But there is no relevant Record/Contact on the remote side (Google Contacts), because it has been deleted by user.
    7- Then we got an error like: {"error":{"code":404,"message":"Requested entity was not found.","status":"NOT_FOUND"}}
    8- The current strategy is skipping these kinds of contacts.

    There are two kinds of questions:
      1- Shall we delete all of the old synced contacts which had been deleted on Google (Which means those contacts that are no longer available on Google)
      2- Shall we create a new contact on Google for an old synced contact that had been deleted on Google (Which means a contact that is no longer available on Google)

      We cannit choose between one or two, each user might prefer either one, So I think it is better to not make it more complex and let it be simple.


    ** So cosider that notFound might be not empty if we want to update some remote contacts on Google.
  */

  /*
    5xx scenario by Google

      connections => [{"error":{"code":500,"message":"Internal error encountered.","status":"INTERNAL"}}]
      It is a known issue: https://stackoverflow.com/questions/63613602/google-people-api-otherscontact-endpoint-internal-error (not solved yet)

      Temporary fix: filter(c => (c.error && c.error.code !== 404 && c.error.code !== 500))
  */

  /*
    429 error

    "error": {
      "code": 429,
      "message": "Quota exceeded for quota metric 'Critical write requests' and limit 'Critical write requests per minute per user' of service 'people.googleapis.com' for consumer 'project_number:xxx'.",
      "status": "RESOURCE_EXHAUSTED",
      "details": [{
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "RATE_LIMIT_EXCEEDED",
        "domain": "googleapis.com",
        "metadata": {
          "consumer": "projects/453194321487",
          "quota_limit": "CriticalWritesPerMinutePerProjectPerUser",
          "service": "people.googleapis.com",
          "quota_metric": "people.googleapis.com/critical_write_requests"
        }
      }]
    }
  */

  /* 
    Another scenario: https://stackoverflow.com/questions/61895430/people-api-quota-exceeded-fbs-quota-limit-exceeded
  */

  const QuotaExceeded = connections.filter(c => (c.error && c.error.code === 429))
  const notFound      = connections.filter(c => (c.error && c.error.code === 404))
  const failed        = connections.filter(c => (c.error && c.error.code !== 404 && c.error.code !== 500 && c.error.code !== 429))

  const toRetry = notFound.length + failed.length

  if (failed.length) {
    Context.log('SyncGoogleContacts - refineConnections failed', JSON.stringify(failed))
    sendSlackMsg('Some of Google contact objects have invalid payload!')
  }

  if (QuotaExceeded.length) {
    Context.log('SyncGoogleContacts - refineConnections failed', JSON.stringify(QuotaExceeded))
    sendSlackMsg('Quota exceeded for Google contacts quota metric!')
  }

  const deleted = connections
    .filter(c => !c.error)
    .filter(con => ((con?.metadata?.objectType === 'PERSON') && con.metadata.deleted))
    .map(con => {

      // old id of google contacts apis v3 
      const entry_id     = con.metadata ? contacts.getEntryId(con.metadata) : null
      const resource_id  = con.resourceName.split('people/').pop()

      return {
        etag: con.etag,
        parked: false,
        resource_id,
        entry_id
      }
    })
    .filter(con => con.resource_id && con.entry_id)

  const confirmed = connections
    .filter(c => !c.error)
    .filter(con => ((con?.metadata?.objectType === 'PERSON') && !con.metadata.deleted))
    .map(con => {

      // old id of google contacts apis v3 
      const entry_id     = con.metadata ? contacts.getEntryId(con.metadata) : null
      const resource_id  = con.resourceName.split('people/').pop()
      const names        = con.names ? contacts.getNames(con.names) : []
      const nickName     = con.nicknames ? contacts.getNickname(con.nicknames) : null
      const photo        = con.photos ? contacts.getPhoto(con.photos) : null
      const birthday     = con.birthdays ? contacts.getBirthday(con.birthdays) : null
      const website      = con.urls ? contacts.getWebsite(con.urls) : null
      const organization = con.organizations ? contacts.getOrganization(con.organizations) : null
      const note         = con.biographies ? contacts.getNote(con.biographies) : null
      const phones       = con.phoneNumbers ? contacts.getPhones(con.phoneNumbers) : []
      const emailes      = con.emailAddresses ? contacts.getEmails(con.emailAddresses) : []
      const addresses    = con.addresses ? contacts.getAddresses(con.addresses) : []
      const memberships  = con.memberships ? contacts.getMemberships(con.memberships) : []
      const clientData   = con.clientData ? con.clientData : []

      return {
        etag: con.etag,
        parked: false,
        resource_id,
        entry_id,
        names,
        nickName,
        photo,
        birthday,
        website,
        organization,
        note,
        phones,
        emailes,
        addresses,
        memberships,
        clientData
      }
    })
    .filter(con => con.resource_id && con.entry_id)

  return {
    confirmed,
    deleted,
    toRetry
  }
}

const refineOtherContacts = (connections) => {
  const QuotaExceeded = connections.filter(c => (c.error && c.error.code === 429))
  const notFound      = connections.filter(c => (c.error && c.error.code === 404))
  const failed        = connections.filter(c => (c.error && c.error.code !== 404 && c.error.code !== 500 && c.error.code !== 429))

  const toRetry = notFound.length + failed.length

  if (failed.length) {
    Context.log('SyncGoogleContacts - refineOtherContacts failed', JSON.stringify(failed))
    sendSlackMsg('Some of Google other contact objects have invalid payload!')
  }

  if (QuotaExceeded.length) {
    Context.log('SyncGoogleContacts - refineOtherContacts failed', JSON.stringify(QuotaExceeded))
    sendSlackMsg('Quota exceeded for Google other contacts quota metric!')
  }

  const deleted = connections
    .filter(c => !c.error)
    .filter(con => ((con?.metadata?.objectType === 'PERSON') && con.metadata.deleted))
    .map(con => {

      // old id of google contacts apis v3 
      const entry_id     = con.metadata ? otherContacts.getEntryId(con.metadata) : null
      const resource_id  = con.resourceName.split('otherContacts/').pop()

      return {
        etag: con.etag,
        parked: true,
        resource_id,
        entry_id
      }
    })
    .filter(con => con.resource_id && con.entry_id)

  const confirmed = connections
    .filter(c => !c.error)
    .filter(con => ((con?.metadata?.objectType === 'PERSON') && !con.metadata.deleted))
    .map(con => {

      // old id of google contacts apis v3 
      const entry_id     = con.metadata ? otherContacts.getEntryId(con.metadata) : null
      const resource_id  = con.resourceName.split('otherContacts/').pop()
      const names        = con.names ? otherContacts.getNames(con.names) : []
      const phones       = con.phoneNumbers ? otherContacts.getPhones(con.phoneNumbers) : []
      const emailes      = con.emailAddresses ? otherContacts.getEmails(con.emailAddresses) : []

      return {
        etag: con.etag,
        parked: true,
        resource_id,
        entry_id,
        names,
        phones,
        emailes,

        nickName: null,
        photo: null,
        birthday: null,
        website: null,
        organization: null,
        note: null,
        addresses: [],
        memberships: []
      }
    })
    .filter(con => con.resource_id && con.entry_id)

  return {
    confirmed,
    deleted,
    toRetry
  }
}


module.exports = {
  refineConnections,
  refineOtherContacts
}
