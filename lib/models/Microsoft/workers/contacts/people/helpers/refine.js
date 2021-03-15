const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date)
}

/**
 * Contains some helper functions used in process of contact 'refining'.
 * Currently, the implementation attempts to be same as Google-side AMAP.
 * TODO: Probably this makes no sense to be same as Google.
 * TODO: Probably its better to remove the functions like `getEntryId`
 * TODO: Add unit tests!
 */
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

  getAddresses: ({ businessAddress, homeAddress, otherAddress }) => {
    const addresses = []

    businessAddress && (addresses.push({ ...businessAddress, type: 'work' }))
    homeAddress && (addresses.push({ ...homeAddress, type: 'home' }))
    otherAddress && (addresses.push({ ...otherAddress, type: 'other' }))

    return addresses.map(addr => ({
      streetAddress: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.countryOrRegion,
      /* TODO: Convert country-name to country-code */
      // countryCode: record.countryCode,
      state: addr.state,
      type: addr.type        
    }))
  },

  getMemberships: (contact) => {
    return []
  },

  getClientData (extensions) {
    const extName = config.microsoft_integration.openExtension.contact.name

    return extensions
      .filter(e => e.extensionName === extName)
      .filter(e => e.rechat_credential && e.rechat_contact)
      .map(e => ({
        key: 'rechatCredential:' + e.rechat_credential,
        value: 'rechatContact:' + e.rechat_contact,
      }))
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

/**
 * Maps (AKA refines) a microsoft-contact to an object that is easier-to-use.
 * @typedef {import('../../../../contact/defs.d.ts').Microsoft.Contact} MicrosoftContact
 * @param {MicrosoftContact[]} contacts
 * @returns {any}
 */
const refineContacts = contacts => contacts
  .filter(Boolean)
  .map(con => ({
    etag: con.lastModifiedDateTime,
    parked: false,
    resource_id: contacts.getEntryId(con.id),
    entry_id: contacts.getEntryId(con.id),
    names: contacts.getNames(con),
    nickName: contacts.getNickname(con.nickName),
    photo: null,
    birthday: contacts.getBirthday(con.birthday),
    website: contacts.getWebsite(con.businessHomePage),
    organization: contacts.getOrganization(con.companyName),
    note: contacts.getNotes(con.personalNotes),
    phones: contacts.getPhones(con),
    emailes: contacts.getEmails(con.emailAddresses),
    addresses: contacts.getAddresses(con),
    memberships: contacts.getMemberships(con),
    clientData: contacts.getClientData(con.extensions),
  }))

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
      const entry_id     = contacts.getEntryId(con.id)
      const resource_id  = contacts.getEntryId(con.id)
      const names        = contacts.getNames(con)
      const nickName     = contacts.getNickname(con.nickname)
      // const photo        = con.photos ? contacts.getPhoto(con.photos) : null
      const birthday     = contacts.getBirthday(con.birthday)
      const website      = contacts.getWebsite(con.businessHomePage)
      const organization = contacts.getOrganization(con.companyName)
      const note         = contacts.getNote(con.personalNotes)
      const phones       = contacts.getPhones(con)
      const emailes      = contacts.getEmails(con.emailAddresses)
      const addresses    = contacts.getAddresses(con)
      const memberships  = contacts.getMemberships(con)
      const clientData   = contacts.getClientData(con.extensions ?? [])

      return {
        etag: con.lastModifiedDateTime,
        parked: false,
        resource_id,
        entry_id,
        names,
        nickName,
        photo: null,
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
  refineOtherContacts,
  refineContacts,
}
