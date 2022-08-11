const { groupBy, difference, chain, filter, isNil, map, find, isEmpty } = require('lodash')
const config = require('../../../../../../config')
const { haveSameMembers } = require('../../../../../../utils/array-utils')

/** @type {string[]} */
const ADDRESS_RELATED_ATTR_TYPES = [
  'postal_code', 'street_name', 'city', 'country', 'state',
]

const parseAttributes = (key, data, contactFolders) => {
  data || (data = {})
  
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'givenName' ) {
    if (data.givenName) {
      attributes.push({
        attribute_type: 'first_name',
        text: data.givenName || ''
      })
    }
  }

  if ( key === 'surname' ) {
    if (data.surname) {
      attributes.push({
        attribute_type: 'last_name',
        text: data.surname || ''
      })
    }
  }

  if ( key === 'middleName' ) {
    if (data.middleName) {
      attributes.push({
        attribute_type: 'middle_name',
        text: data.middleName || ''
      })
    }
  }

  if ( key === 'nickName' ) {
    if (data.nickName) {
      attributes.push({
        attribute_type: 'nickname',
        text: data.nickName || ''
      })
    }
  }

  if ( key === 'title' ) {
    if (data.title) {
      attributes.push({
        attribute_type: 'title',
        text: data.title || ''
      })
    }
  }

  if ( key === 'spouseName' ) {
    if (data.spouseName) {
      attributes.push({
        attribute_type: 'first_name',
        text: data.spouseName || '',
        is_partner: true
      })
    }
  }

  if ( key === 'parentFolderId' ) {
    if ( contactFolders && data.parentFolderId ) {
      if (contactFolders[data.parentFolderId])
        attributes.push({ attribute_type: 'tag', text: contactFolders[data.parentFolderId] || '' })
    }
  }

  if ( key === 'birthday' ) {
    if (data.birthday) {
      const birthday = new Date(data.birthday)
      if(birthday.getFullYear() < 1800) {
        birthday.setFullYear(1800)
      }

      attributes.push({
        attribute_type: 'birthday',
        date: birthday.getTime() / 1000
      })
    }
  }

  if ( key === 'jobTitle' ) {
    if (data.jobTitle)
      attributes.push({ attribute_type: 'job_title', text: data.jobTitle || '' })
  }

  if ( key === 'companyName' ) {
    if (data.companyName)
      attributes.push({ attribute_type: 'company', text: data.companyName || '' })
  }

  if ( key === 'businessHomePage' ) {
    if (data.businessHomePage)
      attributes.push({ attribute_type: 'website', text: data.businessHomePage || '' })
  }

  if ( key === 'personalNotes' ) {
    if (data.personalNotes)
      attributes.push({ attribute_type: 'note', text: data.personalNotes || '' })
  }

  if ( key === 'mobilePhone' ) {
    if (data.mobilePhone) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.mobilePhone || '',
        label: 'Mobile',
        is_primary: false
      })
    }
  }

  if ( key === 'homePhones' ) {
    for (let i = 0; i < data.homePhones.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.homePhones[i] || '',
        label: 'Home',
        is_primary: i === 0 ? true : false
      })
    }
  }

  if ( key === 'businessPhones' ) {
    for (let i = 0; i < data.businessPhones.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.businessPhones[i] || '',
        label: 'Work',
        is_primary: i === 0 ? true : false
      })
    }
  }
  
  if ( key === 'homeAddress' ) {
    if (data?.homeAddress?.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.homeAddress.street || '',
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data?.homeAddress?.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.homeAddress.city || '',
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data?.homeAddress?.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.homeAddress.state || '',
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data?.homeAddress?.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.homeAddress.countryOrRegion || '',
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data?.homeAddress?.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.homeAddress.postalCode || '',
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }
  }

  if ( key === 'businessAddress' ) {
    if (data?.businessAddress?.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.businessAddress.street || '',
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data?.businessAddress?.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.businessAddress.city || '',
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data?.businessAddress?.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.businessAddress.state || '',
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data?.businessAddress?.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.businessAddress.countryOrRegion || '',
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data?.businessAddress?.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.businessAddress.postalCode || '',
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }
  }

  if ( key === 'otherAddress' ) {
    if (data?.otherAddress?.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.otherAddress.street || '',
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data?.otherAddress?.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.otherAddress.city || '',
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data?.otherAddress?.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.otherAddress.state || '',
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data?.otherAddress?.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.otherAddress.countryOrRegion || '',
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data?.otherAddress?.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.otherAddress.postalCode || '',
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }
  }

  if ( key === 'emailAddresses' ) {
    for (let i = 0; i < data.emailAddresses.length; i++) {
      attributes.push({
        attribute_type: 'email',
        text: data.emailAddresses[i]['address'] || '',
        label: 'Other',
        is_primary: i === 0 ? true : false
      })
    }
  }

  if ( key === 'categories' ) {
    for (let i = 0; i < data.categories.length; i++) {
      attributes.push({
        attribute_type: 'tag',
        text: data.categories[i] || ''
      })
    }
  }


  return attributes
}

/**
 * @typedef {import('../../../../contact/defs').Microsoft.Contact} MicrosoftContact
 * @param {MicrosoftContact} data - new (current) contact data
 * @param {MicrosoftContact} oldData - old (previous) contact data
 * @param {IContactAttribute[]} oldAttributes - old (previous) attributes
 * @param {object} contactFolders - user contact folders object
 * @returns {{ attributes: IContactAttributeInput[], deletedAtt: UUID[] }}
 */
const findNewAttributes = (data, oldData, oldAttributes, contactFolders) => {
  data || (data = {})
  oldData || (oldData = {})
  
  /**
   * Array of deleted attribute IDs
   * @type {UUID[]}
   */
  const deletedAtt  = []
  oldAttributes = oldAttributes ?? []
  const refinedAtts = groupBy(oldAttributes, 'attribute_type')

  /** @type {IContactAttributeInput[]} */
  const attributes = []

  // Singular Attributes
  if ( data.parentFolderId !== oldData.parentFolderId ) {
    const tagAtt = refinedAtts?.tag?.[0]
    let removeCurrentTag = true
    if(contactFolders[data.parentFolderId]) {
      removeCurrentTag = false
      attributes.push({
        ...(tagAtt ? { id: tagAtt.id } : null),
        attribute_type: 'tag',
        text: contactFolders[data.parentFolderId],
      })
    }
  
    const contactFoldersName = Object.values(contactFolders)
    // To delete old tag attributes which those related to contactFolders
    oldAttributes.filter(att => {
      if(contactFoldersName.includes(att.text)) {
        if(removeCurrentTag || tagAtt?.id !== att.id) {
          return true  
        }
        return false
      }
      return false
    }).forEach(att => deletedAtt.push(att.id))
  }

  if ( data.givenName !== oldData.givenName ) {
    const firstNameAtt = refinedAtts?.first_name?.[0]
    
    attributes.push({
      ...(firstNameAtt ? { id: firstNameAtt.id } : null),
      attribute_type: 'first_name',
      text: data.givenName || '',
    })
  }

  if (data.title !== oldData.title) {
    const titleAtt = refinedAtts?.title?.[0]

    attributes.push({
      ...(titleAtt ? { id: titleAtt.id } : null),
      attribute_type: 'title',
      text: data.title || '',
    })
  }

  if ( data.surname !== oldData.surname ) {
    const lastNameAtt = refinedAtts?.last_name?.[0]

    attributes.push({
      ...(lastNameAtt ? { id: lastNameAtt.id } : null),
      attribute_type: 'last_name',
      text: data.surname || '',
    })
  }

  if ( data.middleName !== oldData.middleName ) {
    const middleNameAtt = refinedAtts?.middle_name?.[0]

    attributes.push({
      ...(middleNameAtt ? { id: middleNameAtt.id } : null),
      attribute_type: 'middle_name',
      text: data.middleName || '',
    })
  }

  if ( data.nickName !== oldData.nickName ) {
    const nickNameAtt = refinedAtts?.nickname?.[0]

    attributes.push({
      ...(nickNameAtt ? { id: nickNameAtt.id } : null),
      attribute_type: 'nickname',
      text: data.nickName || '',
    })
  }

  if ( data.title !== oldData.title ) {
    const titleAtt = refinedAtts?.title?.[0]

    attributes.push({
      ...(titleAtt ? { id: titleAtt.id } : null),
      attribute_type: 'title',
      text: data.title || '',
    })
  }

  if ( data.spouseName !== oldData.spouseName ) {
    const spouseNameAtt = refinedAtts?.first_name?.find?.(a => a.is_partner)

    attributes.push({
      ...(spouseNameAtt ? { id: spouseNameAtt.id } : null),
      attribute_type: 'first_name',
      text: data.spouseName || '',
      is_partner: true,
    })
  }

  if ( data.jobTitle !== oldData.jobTitle ) {
    const jobTitleAtt = refinedAtts?.job_title?.[0]

    attributes.push({
      ...(jobTitleAtt ? { id: jobTitleAtt.id } : null),
      attribute_type: 'job_title',
      text: data.jobTitle || '',
    })
  }

  if ( data.companyName !== oldData.companyName ) {
    const companyAtt = refinedAtts?.company?.[0]

    attributes.push({
      ...(companyAtt ? { id: companyAtt.id } : null),
      attribute_type: 'company',
      text: data.companyName || '',
    })
  }


  if ( data.birthday && data.birthday !== oldData.birthday ) {
    const birthdayAtt = refinedAtts?.birthday?.[0]
    const birthday = new Date(data.birthday)
    
    attributes.push({
      ...(birthdayAtt ? { id: birthdayAtt.id } : null),
      attribute_type: 'birthday',
      date: birthday.getTime() / 1000,
    })
  }

  if ( data.businessHomePage !== oldData.businessHomePage ) {
    const websiteAtt = refinedAtts?.website?.[0]

    attributes.push({
      ...(websiteAtt ? { id: websiteAtt.id } : null),
      attribute_type: 'website',
      text: data.businessHomePage || '',
    })
  }

  // Non Singular Attributes
  if ( data.personalNotes !== oldData.personalNotes ) {
    const noteAtt = refinedAtts?.note?.find?.(e => e.text === oldData.personalNotes)

    attributes.push({
      ...(noteAtt ? { id: noteAtt.id } : null),
      attribute_type: 'note',
      text: data.personalNotes || '',
    })
  }

  if ( data.mobilePhone !== oldData.mobilePhone ) {
    const phoneAtt = refinedAtts.phone_number?.find?.(ph => ph.text === oldData.mobilePhone)
    
    attributes.push({
      ...(phoneAtt ? { id: phoneAtt.id } : null),
      attribute_type: 'phone_number',
      text: data.mobilePhone || '',
      label: 'Mobile',
      is_primary: false
    })
  }

  if ( !haveSameMembers(data.homePhones, oldData.homePhones) ) {
    const deletedHomePhones = difference(oldData.homePhones, data.homePhones)
    const addedHomePhones = difference(data.homePhones, oldData.homePhones)

    deletedHomePhones
      .map(dhp => refinedAtts.phone_number?.find?.(e => e.text === dhp && e.label === 'Home'))
      .filter(Boolean)
      .forEach(att => deletedAtt.push(att.id))

    addedHomePhones.forEach(ahp => {
      if (!ahp) { return }
      
      const existing = refinedAtts.phone_number?.find?.(e => e.text === ahp && e.label === 'Home')

      attributes.push({
        ...(existing ? { id: existing.id } : null),
        attribute_type: 'phone_number',
        text: ahp || '',
        label: 'Home',
        is_primary: false,
      })
    })
  }

  if ( !haveSameMembers(data.businessPhones, oldData.businessPhones) ) {
    const deletedBusinessPhones = difference(oldData.businessPhones, data.businessPhones)
    const addedBusinessPhones = difference(data.businessPhones, oldData.businessPhones)

    deletedBusinessPhones
      .map(dbp => refinedAtts.phone_number?.find?.(e => e.text === dbp && e.label === 'Work'))
      .filter(Boolean)
      .forEach(att => deletedAtt.push(att.id))

    addedBusinessPhones.forEach(abp => {
      if (!abp) { return }
      
      const existing = refinedAtts.phone_number?.find?.(e => e.text === abp && e.label === 'Work')

      attributes.push({
        ...(existing ? { id: existing.id } : null),
        attribute_type: 'phone_number',
        text: abp || '',
        label: 'Work',
        is_primary: false,
      })
    })
  }

  const dataEmails = (data.emailAddresses ?? []).map(e => e.address).sort()
  const oldDataEmails = (oldData.emailAddresses ?? []).map(e => e.address).sort()

  if (!haveSameMembers(dataEmails, oldDataEmails)) {
    const deletedEmails = difference(oldDataEmails, dataEmails)
    const addedEmails = difference(dataEmails, oldDataEmails)

    deletedEmails
      .map(de => refinedAtts.email?.find?.(e => e.text === de && e.label === 'Other'))
      .filter(Boolean)
      .forEach(att => deletedAtt.push(att.id))

    addedEmails.forEach(ae => {
      if (!ae) { return }
      
      const existing = refinedAtts.email?.find?.(e => e.text === ae && e.label === 'Other')

      attributes.push({
        ...(existing ? { id: existing.id } : null),
        attribute_type: 'email',
        text: ae || '',
        label: 'Other',
        is_primary: false,
      })
    })
  }


  const addressArr = [...refinedAtts.postal_code || [], ...refinedAtts.street_name || [], ...refinedAtts.city || [], ...refinedAtts.country || [], ...refinedAtts.state || []]
  let maxIndex = Math.max(1, ...addressArr.map(e => Number(e.index) || 0))

  if ( haveSameMembers(data.homeAddress, oldData.homeAddress) ) {
    maxIndex ++
    console.log({d: data.homeAddress, o: oldData.homeAddress, addressArr})
    /* Lets simply delete all existing home addresses \m/ */
    addressArr
      .filter(att => att.is_primary && att.label === 'Home')
      .forEach(att => deletedAtt.push(att.id))

    if (data?.homeAddress?.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.homeAddress.street || '',
        label: 'Home',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.homeAddress?.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.homeAddress.city || '',
        label: 'Home',
        index: maxIndex,
        is_primary: false
      })
    }

    if (data?.homeAddress?.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.homeAddress.state || '',
        label: 'Home',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.homeAddress?.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.homeAddress.countryOrRegion || '',
        label: 'Home',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.homeAddress?.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.homeAddress.postalCode || '',
        label: 'Home',
        index: maxIndex,
        is_primary: false
      })
    }
  }

  if ( !haveSameMembers(data.businessAddress, oldData.businessAddress) ) {
    maxIndex ++

    addressArr
      .filter(att => !att.is_primary && att.label === 'Work')
      .forEach(att => deletedAtt.push(att.id))
    
    if (data?.businessAddress?.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.businessAddress.street || '',
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.businessAddress?.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.businessAddress.city || '',
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }

    if (data?.businessAddress?.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.businessAddress.state || '',
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.businessAddress?.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.businessAddress.countryOrRegion || '',
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.businessAddress?.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.businessAddress.postalCode || '',
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  }

  if ( !haveSameMembers(data.otherAddress, oldData.otherAddress) ) {
    maxIndex ++

    addressArr
      .filter(att => !att.is_primary && att.label === 'Other')
      .forEach(att => deletedAtt.push(att.id))
    
    if (data?.otherAddress?.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.otherAddress.street || '',
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.otherAddress?.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.otherAddress.city || '',
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }

    if (data?.otherAddress?.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.otherAddress.state || '',
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.otherAddress?.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.otherAddress.countryOrRegion || '',
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data?.otherAddress?.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.otherAddress.postalCode || '',
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  }


  if ( !haveSameMembers(data.categories, oldData.categories) ) {
    const deletedTags = difference(oldData.categories, data.categories)
    const addedTags = difference(data.categories, oldData.categories)

    deletedTags
      .map(dt => refinedAtts.tag?.find?.(e => e.text === dt))
      .filter(Boolean)
      .forEach(att => deletedAtt.push(att.id))

    addedTags.forEach(at => {
      if (!at) { return }
      
      const existing = refinedAtts.tag?.find?.(e => e.text === at)

      attributes.push({
        ...(existing ? { id: existing.id } : null),
        attribute_type: 'tag',
        text: at || '',
      })
    })
  }

  return {
    attributes,
    deletedAtt
  }
}

/**
 * Normalizes the contact attributes. Actually this function sorts
 * the attributes and group them by their type.
 * TODO: Probabely this function needs a better name.
 * @param {IContactAttributeInput[]} attributes
 * @returns {Record<string, IContactAttributeInput[]}
 */
const normalizeAttributes = attributes => chain(attributes)
  .orderBy(['is_primary', 'updated_at'], ['desc', 'desc'])
  .groupBy('attribute_type')
  .value()

/**
 * Selects a Microsoft-address from available addresses in the attributes
 * @param {IContactAttributeInput[]} attributes
 * @param {string} label
 * @returns {MsAddress | null}
 */
const chooseAddressAmongAttributes = (attributes, label) => chain(attributes)
  .filter(
    { label },
    attr => ADDRESS_RELATED_ATTR_TYPES.includes(attr.attribute_type)
  )
  .orderBy(['is_primary', 'index', 'updated_at'])
  .thru(addrs => {
    const index = addrs?.slice(-1)?.pop()?.index
    return isNil(index) ? null : filter(addrs, { index })
  })
  .keyBy('attribute_type')
  .mapValues('text')
  .thru(addr => {
    if (isEmpty(addr)) { return null }
      
    return {
      countryOrRegion: addr.country ?? '',
      state: addr.state ?? '',
      city: addr.city ?? '',
      street: addr.street_name ?? '',
      postalCode: addr.postal_code ?? '',
    }
  })
  .value()

/**
 * @typedef {import('../../../../contact/defs').Microsoft.Contact} MsAddress
 * @typedef {import('../../../../contact/defs').Microsoft.EmailAddress} MsEmail
 */
const generateMContacts = (credential, contacts) => {
  return contacts.map(contact => {
    const attrs = normalizeAttributes(contact.attributes)
    const chooseAddress = chooseAddressAmongAttributes.bind(
      null, contact.attributes
    )
    
    /**
     * Extracts phone-number attributes with specified label
     * @param {string} label
     * @returns {string[]}
     */
    const extractPhones = label => chain(attrs.phone_number)
      .filter({ label })
      .map('text')
      .value()

    /**
     * Extracts a date attribute. returns ISO date string.
     * @param {string} type - The attribute-type.
     * @returns {string?}
     */
    const extractDate = type => {
      const val = singular(type, 'date')

      if (isNil(val)) { return null }
      const date = new Date(val)

      if (isNaN(date)) { return null }
      return date.toISOString()
    }
    
    /**
     * Maps email attribute to Microsoft EmailAddress object
     * @param {{ text: string }} $0 - The attribute
     * @returns {MsEmail}
     */
    const toMsEmail = ({ text }) => ({ address: text, name: text })

    /**
     * Extracts and returns a singular attribute-value
     * @param {string} type The attribute-type
     * @param {string} prop The property to pick
     * @returns {?}
     */
    const singular = (type, prop = 'text') => attrs[type]?.[0]?.[prop]
    
    /**
     * Returns {[key]: val} if val is truthy, otherwise null
     * @param {string} key
     * @param {any} val
     * @returns {?}
     */
    const maybe = (key, val) => val ? { [key]: val } : null

    const firstName = find(attrs.first_name, { is_partner: false })?.text
    const spouseName = find(attrs.first_name, 'is_partner')?.text
    const emailAddresses = map(attrs.email, toMsEmail)
    const categories = map(attrs.tag, 'text')
    
    return {
      contact: contact.id,
      resource: {
        /* Simple singular attributes: */
        ...maybe('title', singular('title')),
        ...maybe('givenName', firstName),
        ...maybe('middleName', singular('middle_name')),
        ...maybe('surname', singular('last_name')),
        ...maybe('nickName', singular('nickname')),
        ...maybe('companyName', singular('company')),
        ...maybe('jobTitle', singular('job_title')),
        ...maybe('personalNotes', singular('note')),
        ...maybe('businessHomePage', singular('website')),

        /* Addresses: */
        ...maybe('businessAddress', chooseAddress('Work')),
        ...maybe('otherAddress', chooseAddress('Other')),
        ...maybe('homeAddress', chooseAddress('Home')),

        /* Phone numbers: */
        ...maybe('mobilePhone', extractPhones('Mobile')?.[0]),
        ...maybe('businessPhones', extractPhones('Work')),
        ...maybe('homePhones', extractPhones('Home')),

        /* Misc.: */
        ...maybe('birthday', extractDate('birthday')),
        ...maybe('emailAddresses', emailAddresses),
        ...maybe('categories', categories),
        ...maybe('spouseName', spouseName),
        
        extensions: [{
          '@odata.type': 'microsoft.graph.openTypeExtension',
          extensionName: config.microsoft_integration.openExtension.contact.name,
          shared: true,
          origin: 'rechat',
          rechat_credential: credential,
          rechat_contact: contact.id,
        }],
      }
    }
  })
}


module.exports = {
  parseAttributes,
  findNewAttributes,
  generateMContacts,

  /* Export only for test: */
  normalizeAttributes,
  chooseAddressAmongAttributes,
}
