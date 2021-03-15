const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date)
}

const contacts = {
  getEntryId: (id) => {
    return id
  },

  getNames: (con) => {
    return {
      ...(con.displayName ? { displayName: con.displayName } : null),
      ...(con.givenName ? { givenName : con.givenName } : null),
      ...(con.surname ? { familyName: con.surname } : null),
      ...(con.middleName ? { middleName: con.middleName } : null),
    }
  },

  getNickname: (nickname) => {
    return nickname ?? null
  },

  getPhoto: (photos) => {
    const result = photos.filter(record => (record?.metadata?.primary && !record.default)).map(record => record.url)
    return result[0]
  },

  getBirthday: (birthday) => {
    return birthday && isValidDate(new Date(birthday)) ? birthday : null
  },

  getWebsite: (website) => {
    return website ?? null
  },

  getOrganization: (organization) => {
    return organization ?? null
  },

  getNote: (note) => {
    return note ?? null
  },

  getPhones: ({ homePhones, businessPhones, mobilePhones }) => {
    return [
      ...(homePhones ?? []).map(hp => ({ type: 'home', value: hp })),
      ...(businessPhones ?? []).map(bp => ({ type: 'work', value: bp })),
      ...(mobilePhones ?? []).map(mp => ({ type: 'mobile', value: mp })),
    ]
  },

  getEmails: (emailAddresses) => {
    return (emailAddresses ?? []).map(e => ({
      value: e.address,
      type: 'other',
    }))
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

  getMemberships: (contact) => {
    return []
  },
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
    deleted
  }
}

const refineOtherContacts = (connections) => {
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
    deleted
  }
}


module.exports = {
  refineConnections,
  refineOtherContacts
}