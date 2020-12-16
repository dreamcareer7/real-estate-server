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
        middleName: record.middleName
      }
    })
  
    return result[0]
  },

  getNickname: (nicknames) => {
    const result = nicknames.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.value)
    return result[0]
  },

  getPhoto: (photos) => {
    const result = photos.filter(record => (!record.default && record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.url)
    return result[0]
  },

  getBirthday: (birthdays) => {
    const result = birthdays.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.text)
    return result[0]
  },

  getWebsite: (urls) => {
    const result = urls.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.value)
    return result[0]
  },

  getOrganization: (organizations) => {
    const result = organizations.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => {
      return {
        jobTitle: record.name,
        company: record.title
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
  return connections
    .filter(connection => ((connection.metadata.objectType === 'PERSON') && !connection.metadata.deleted))
    .map(connection => {

      // old id of google contacts apis v3 
      const resource_id  = connection.resourceName
      const entry_id     = connection.metadata ? contacts.getEntryId(connection.metadata) : null
      const names        = connection.names ? contacts.getNames(connection.names) : []
      const nickName     = connection.nicknames ? contacts.getNickname(connection.nicknames) : null
      const photo        = connection.photos ? contacts.getPhoto(connection.photos) : null
      const birthday     = connection.birthdays ? contacts.getBirthday(connection.birthdays) : null
      const website      = connection.urls ? contacts.getWebsite(connection.urls) : null
      const organization = connection.organizations ? contacts.getOrganization(connection.organizations) : null
      const note         = connection.biographies ? contacts.getNote(connection.biographies) : null
      const phones       = connection.phoneNumbers ? contacts.getPhones(connection.phoneNumbers) : []
      const emailes      = connection.emailAddresses ? contacts.getEmails(connection.emailAddresses) : []
      const addresses    = connection.addresses ? contacts.getAddresses(connection.addresses) : []
      const memberships  = connection.memberships ? contacts.getMemberships(connection.memberships) : []
      
      if ( !resource_id || !entry_id ) {
        return false
      }

      return {
        etag: connection.etag,
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
        memberships
      }
    })
}

const refineOtherContacts = (connections) => {
  return connections
    .filter(connection => ((connection.metadata.objectType === 'PERSON') && !connection.metadata.deleted))
    .map(connection => {

      // old id of google contacts apis v3 
      const resource_id  = connection.resourceName
      const entry_id     = connection.metadata ? otherContacts.getEntryId(connection.metadata) : null
      const names        = connection.names ? otherContacts.getNames(connection.names) : []
      const phones       = connection.phoneNumbers ? otherContacts.getPhones(connection.phoneNumbers) : []
      const emailes      = connection.emailAddresses ? otherContacts.getEmails(connection.emailAddresses) : []
      
      if ( !resource_id || !entry_id ) {
        return false
      }

      return {
        etag: connection.etag,
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
}


module.exports = {
  refineConnections,
  refineOtherContacts
}