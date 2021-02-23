const { groupBy, isEqual, difference } = require('lodash')


// eslint-disable-next-line no-unused-vars
const getArrayDiff = (arr_1, arr_2) => {
  const a_1 = [...new Set(arr_1)]
  const a_2 = [...new Set(arr_2)]

  const a    = []
  const diff = []

  for (let i = 0; i < a_1.length; i++) {
    a[a_1[i]] = true
  }

  for (let i = 0; i < a_2.length; i++) {
    if (a[a_2[i]]) {
      delete a[a_2[i]]
    } else {
      a[a_2[i]] = true
    }
  }

  for (const k in a) {
    diff.push(k)
  }

  return diff
}

const parseAttributes = (key, data, contactFolders) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'givenName' ) {
    if (data.givenName) {
      attributes.push({
        attribute_type: 'first_name',
        text: data.givenName
      })
    }
  }

  if ( key === 'surname' ) {
    if (data.surname) {
      attributes.push({
        attribute_type: 'last_name',
        text: data.surname
      })
    }
  }

  if ( key === 'middleName' ) {
    if (data.middleName) {
      attributes.push({
        attribute_type: 'middle_name',
        text: data.middleName
      })
    }
  }

  if ( key === 'nickName' ) {
    if (data.nickName) {
      attributes.push({
        attribute_type: 'nickname',
        text: data.nickName
      })
    }
  }

  if ( key === 'title' ) {
    if (data.title) {
      attributes.push({
        attribute_type: 'title',
        text: data.title
      })
    }
  }

  if ( key === 'spouseName' ) {
    if (data.spouseName) {
      attributes.push({
        attribute_type: 'first_name',
        text: data.spouseName,
        is_partner: true
      })
    }
  }

  if ( key === 'parentFolderId' ) {
    if ( contactFolders && data.parentFolderId ) {
      if (contactFolders[data.parentFolderId])
        attributes.push({ attribute_type: 'tag', text: contactFolders[data.parentFolderId] })
    }
  }

  if ( key === 'birthday' ) {
    if (data.birthday) {
      const birthday = new Date(data.birthday)

      attributes.push({
        attribute_type: 'birthday',
        date: birthday.getTime() / 1000
      })
    }
  }

  if ( key === 'jobTitle' ) {
    if (data.jobTitle)
      attributes.push({ attribute_type: 'job_title', text: data.jobTitle })
  }

  if ( key === 'companyName' ) {
    if (data.companyName)
      attributes.push({ attribute_type: 'company', text: data.companyName })
  }

  if ( key === 'businessHomePage' ) {
    if (data.businessHomePage)
      attributes.push({ attribute_type: 'website', text: data.businessHomePage })
  }

  if ( key === 'personalNotes' ) {
    if (data.personalNotes)
      attributes.push({ attribute_type: 'note', text: data.personalNotes })
  }

  if ( key === 'mobilePhone' ) {
    if (data.mobilePhone) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.mobilePhone,
        label: 'Mobile',
        is_primary: false
      })
    }
  }

  if ( key === 'homePhones' ) {
    for (let i = 0; i < data.homePhones.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.homePhones[i],
        label: 'Home',
        is_primary: i === 0 ? true : false
      })
    }
  }

  if ( key === 'businessPhones' ) {
    for (let i = 0; i < data.businessPhones.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.businessPhones[i],
        label: 'Work',
        is_primary: i === 0 ? true : false
      })
    }
  }
  
  if ( key === 'homeAddress' ) {
    if (data.homeAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.homeAddress.street,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data.homeAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.homeAddress.city,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data.homeAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.homeAddress.state,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data.homeAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.homeAddress.countryOrRegion,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }

    if (data.homeAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.homeAddress.postalCode,
        label: 'Home',
        index: 1,
        is_primary: true
      })
    }
  }

  if ( key === 'businessAddress' ) {
    if (data.businessAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.businessAddress.street,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data.businessAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.businessAddress.city,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data.businessAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.businessAddress.state,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data.businessAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.businessAddress.countryOrRegion,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }

    if (data.businessAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.businessAddress.postalCode,
        label: 'Work',
        index: 2,
        is_primary: false
      })
    }
  }

  if ( key === 'otherAddress' ) {
    if (data.otherAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.otherAddress.street,
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data.otherAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.otherAddress.city,
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data.otherAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.otherAddress.state,
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data.otherAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.otherAddress.countryOrRegion,
        label: 'Other',
        index: 3,
        is_primary: false
      })
    }

    if (data.otherAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.otherAddress.postalCode,
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
        text: data.emailAddresses[i]['address'],
        label: 'Other',
        is_primary: i === 0 ? true : false
      })
    }
  }

  if ( key === 'categories' ) {
    for (let i = 0; i < data.categories.length; i++) {
      attributes.push({
        attribute_type: 'tag',
        text: data.categories[i]
      })
    }
  }


  return attributes
}

const findNewAttributes = (data, oldData, oldAttributes) => {
  /**
   * Array of deleted attribute IDs
   * @type {UUID[]}
   */
  const deletedAtt  = []
  const refinedAtts = groupBy(oldAttributes, entry => entry.attribute_type)

  /** @type {IContactAttributeInput[]} */
  const attributes = []

  // Singular Attributes
  if ( data.givenName !== oldData.givenName ) {
    const firstNameAtt = refinedAtts?.first_name?.[0]
    
    attributes.push({
      ...(firstNameAtt ? { id: firstNameAtt.id } : null),
      attribute_type: 'first_name',
      text: data.givenName ?? '',
    })
  }

  if ( data.surname !== oldData.surname ) {
    const lastNameAtt = refinedAtts?.last_name?.[0]

    attributes.push({
      ...(lastNameAtt ? { id: lastNameAtt.id } : null),
      attribute_type: 'last_name',
      text: data.surname ?? '',
    })
  }

  if ( data.middleName !== oldData.middleName ) {
    const middleNameAtt = refinedAtts?.middle_name?.[0]

    attributes.push({
      ...(middleNameAtt ? { id: middleNameAtt.id } : null),
      attribute_type: 'middle_name',
      text: data.middleName ?? '',
    })
  }

  if ( data.nickName !== oldData.nickName ) {
    const nickNameAtt = refinedAtts?.nickname?.[0]

    attributes.push({
      ...(nickNameAtt ? { id: nickNameAtt.id } : null),
      attribute_type: 'nickname',
      text: data.nickName ?? '',
    })
  }

  if ( data.title !== oldData.title ) {
    const titleAtt = refinedAtts?.title?.[0]

    attributes.push({
      ...(titleAtt ? { id: titleAtt.id } : null),
      attribute_type: 'title',
      text: data.title ?? '',
    })
  }

  if ( data.spouseName !== oldData.spouseName ) {
    const spouseNameAtt = refinedAtts?.first_name?.find?.(a => a.is_partner)

    attributes.push({
      ...(spouseNameAtt ? { id: spouseNameAtt.id } : null),
      attribute_type: 'first_name',
      text: data.spouseName ?? '',
      is_partner: true,
    })
  }

  if ( data.jobTitle !== oldData.jobTitle ) {
    const jobTitleAtt = refinedAtts?.job_title?.[0]

    attributes.push({
      ...(jobTitleAtt ? { id: jobTitleAtt.id } : null),
      attribute_type: 'job_title',
      text: data.jobTitle ?? '',
    })
  }

  if ( data.companyName !== oldData.companyName ) {
    const companyAtt = refinedAtts?.company?.[0]

    attributes.push({
      ...(companyAtt ? { id: companyAtt.id } : null),
      attribute_type: 'company',
      text: data.companyName ?? '',
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
      text: data.businessHomePage ?? '',
    })
  }



  // Non Singular Attributes
  if ( data.personalNotes !== oldData.personalNotes ) {
    const noteAtt = refinedAtts?.note?.[0]

    attributes.push({
      ...(noteAtt ? { id: noteAtt.id } : null),
      attribute_type: 'note',
      text: data.personalNotes ?? '',
    })
  }



  if ( data.mobilePhone !== oldData.mobilePhone ) {
    const phoneAtt = refinedAtts.phone_number?.find?.(ph => ph.text === data.mobilePhone)
    
    attributes.push({
      ...(phoneAtt ? { id: phoneAtt.id } : null),
      attribute_type: 'phone_number',
      text: data.mobilePhone ?? '',
      label: 'Mobile',
      is_primary: false
    })
  }

  if ( !isEqual(data.homePhones, oldData.homePhones) ) {
    const deletedHomePhones = difference(oldData.homePhones, data.homePhones)
    const addedHomePhones = difference(data.homePhones, oldData.homePhones)

    deletedHomePhones
      .map(dhp => refinedAtts.phone_number?.find?.(e => e.text === dhp && e.label === 'Home'))
      .filter(Boolean)
      .forEach(attId => deletedAtt.push(attId))

    addedHomePhones.forEach(ahp => {
      /* do not check for e.label for finding existing attr. to prevent
         duplicate phone number w/ different labels */
      const existing = refinedAtts.phone_number?.find?.(e => e.text === ahp)

      attributes.push({
        ...(existing ? { id: existing.id } : null),
        attribute_type: 'phone_numbar',
        text: ahp ?? '',
        label: 'Home',
        is_primary: false,
      })
    })
  }

  if ( !isEqual(data.businessPhones, oldData.businessPhones) ) {
    const deletedBusinessPhones = difference(oldData.businessPhones, data.businessPhones)
    const addedBusinessPhones = difference(data.businessPhones, oldData.businessPhones)

    deletedBusinessPhones
      .map(dbp => refinedAtts.phone_number?.find?.(e => e.text === dbp && e.label === 'Work'))
      .filter(Boolean)
      .forEach(attId => deletedAtt.push(attId))

    addedBusinessPhones.forEach(abp => {
      const existing = refinedAtts.phone_number?.find?.(e => e.text === abp)

      attributes.push({
        ...(existing ? { id: existing.id } : null),
        attribute_type: 'phone_number',
        text: abp ?? '',
        label: 'Work',
        is_primary: false,
      })
    })
  }

  const dataEmails = (data.emailAddresses ?? []).map(e => e.address).sort()
  const oldDataEmails = (data.emailAddresses ?? []).map(e => e.address).sort()

  if (!isEqual(dataEmails, oldDataEmails)) {
    const deletedEmails = difference(oldDataEmails, dataEmails)
    const addedEmails = difference(dataEmails, oldDataEmails)

    deletedEmails
      .map(de => refinedAtts.email?.find?.(e => e.text === de && e.label === 'Other'))
      .filter(Boolean)
      .forEach(attId => deletedAtt.push(attId))

    addedEmails.forEach(ae => {
      const existing = refinedAtts.email?.find?.(e => e.text === ae && e.label === 'Other')

      attributes.push({
        ...(existing ? { id: existing.id } : null),
        attribute_type: 'email',
        text: ae ?? '',
        label: 'Other',
        is_primary: false,
      })
    })
  }


  const addressArr = [...refinedAtts.postal_code || [], ...refinedAtts.street_name || [], ...refinedAtts.city || [], ...refinedAtts.country || [], ...refinedAtts.state || []]
  let maxIndex = Math.max(1, ...addressArr.map(e => Number(e.index) || 0))

  if ( !isEqual(data.homeAddress, oldData.homeAddress) ) {
    maxIndex ++

    if (data.homeAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.homeAddress.street,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (data.homeAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.homeAddress.city,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }

    if (data.homeAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.homeAddress.state,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (data.homeAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.homeAddress.countryOrRegion,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (data.homeAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.homeAddress.postalCode,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  }

  if ( !isEqual(data.businessAddress, oldData.businessAddress) ) {
    maxIndex ++

    if (data.businessAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.businessAddress.street,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data.businessAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.businessAddress.city,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }

    if (data.businessAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.businessAddress.state,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data.businessAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.businessAddress.countryOrRegion,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data.businessAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.businessAddress.postalCode,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  }

  if ( !isEqual(data.otherAddress, oldData.otherAddress) ) {
    maxIndex ++

    if (data.otherAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: data.otherAddress.street,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data.otherAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: data.otherAddress.city,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }

    if (data.otherAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: data.otherAddress.state,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data.otherAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: data.otherAddress.countryOrRegion,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (data.otherAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: data.otherAddress.postalCode,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  }


  const oldTags = refinedAtts?.tag?.map?.(e => e.text) ?? []
  
  if ( !isEqual(data.categories, oldData.categories) ) {

    if (refinedAtts.tag) {
      for ( let i = 0; i < refinedAtts.tag.length; i++ ) {
        if ( !data.categories.includes(refinedAtts.tag[i].text) ) {
          deletedAtt.push(refinedAtts.tag[i].id)
        }
      }
    }

    for ( const tag of data.categories ) {
      if ( !oldTags.includes(tag) ) {
        attributes.push({
          attribute_type: 'tag',
          text: tag
        })
      }
    }
  }

  return {
    attributes,
    deletedAtt
  }
}


module.exports = {
  parseAttributes,
  findNewAttributes
}
