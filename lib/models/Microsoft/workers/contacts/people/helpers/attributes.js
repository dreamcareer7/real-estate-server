const { groupBy, isEqual } = require('lodash')



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
  const deletedAtt  = []
  const refinedAtts = groupBy(oldAttributes, function(entry) { return entry.attribute_type })

  /** @type {IContactAttributeInput[]} */
  const attributes = []

  // Singular Attributes
  if ( data.givenName !== oldData.givenName ) {
    const firstNameAtt = refinedAtts.first_name ? (refinedAtts.first_name.length ? refinedAtts.first_name[0].text : null) : null

    if ( data.givenName && !firstNameAtt ) {
      attributes.push({ attribute_type: 'first_name', text: data.givenName })
    }
  }

  if ( data.surname !== oldData.surname ) {
    const lastNameAtt = refinedAtts.last_name ? (refinedAtts.last_name.length ? refinedAtts.last_name[0].text : null) : null

    if ( data.surname && !lastNameAtt ) {
      attributes.push({ attribute_type: 'last_name', text: data.surname })
    }
  }

  if ( data.middleName !== oldData.middleName ) {
    const middleNameAtt = refinedAtts.middle_name ? (refinedAtts.middle_name.length ? refinedAtts.middle_name[0].text : null) : null

    if ( data.middleName && !middleNameAtt ) {
      attributes.push({ attribute_type: 'middle_name', text: data.middleName })
    }
  }

  if ( data.nickName !== oldData.nickName ) {
    const nickNameAtt = refinedAtts.nickname ? (refinedAtts.nickname.length ? refinedAtts.nickname[0].text : null) : null

    if ( data.nickName && !nickNameAtt ) {
      attributes.push({ attribute_type: 'nickname', text: data.nickName })
    }
  }

  if ( data.title !== oldData.title ) {
    const titleAtt = refinedAtts.title ? (refinedAtts.title.length ? refinedAtts.title[0].text : null) : null

    if ( data.title && !titleAtt ) {
      attributes.push({ attribute_type: 'title', text: data.title })
    }
  }

  if ( data.spouseName !== oldData.spouseName ) {
    let spouseNameAtt = null

    if ( refinedAtts.first_name ) {
      for ( const att of refinedAtts.first_name ) {
        if ( att.is_partner ) {
          spouseNameAtt = att.text
        }
      }
    }

    if ( data.spouseName && !spouseNameAtt ) {
      attributes.push({ attribute_type: 'first_name', text: data.spouseName, is_partner: true })
    }
  }

  if ( data.jobTitle !== oldData.jobTitle ) {
    const jobTitleAtt = refinedAtts.job_title ? (refinedAtts.job_title.length ? refinedAtts.job_title[0].text : null) : null

    if ( data.jobTitle && !jobTitleAtt ) {
      attributes.push({ attribute_type: 'job_title', text: data.jobTitle })
    }
  }

  if ( data.companyName !== oldData.companyName ) {
    const companyAtt = refinedAtts.company ? (refinedAtts.company.length ? refinedAtts.company[0].text : null) : null

    if ( data.companyName && !companyAtt ) {
      attributes.push({ attribute_type: 'company', text: data.companyName })
    }
  }


  if ( data.birthday !== oldData.birthday ) {
    const birthdayAtt = refinedAtts.birthday ? (refinedAtts.birthday.length ? refinedAtts.birthday[0].date : null) : null

    if (data.birthday && !birthdayAtt) {
      const birthday = new Date(data.birthday)
      attributes.push({ attribute_type: 'birthday', date: birthday.getTime() / 1000 })
    }
  }

  if ( data.businessHomePage !== oldData.businessHomePage ) {
    const websiteeAtt = refinedAtts.website ? (refinedAtts.website.length ? refinedAtts.website[0].text : null) : null

    if ( data.businessHomePage && !websiteeAtt ) {
      attributes.push({ attribute_type: 'website', text: data.businessHomePage })
    }
  }



  // None Singulr Attributes
  if ( data.personalNotes !== oldData.personalNotes ) {
    if (data.personalNotes) {
      attributes.push({ attribute_type: 'note', text: data.personalNotes })
    }
  }


  const oldPhoneNumbers = refinedAtts.phone_number ? (refinedAtts.phone_number.map(entry => entry.text)) : []

  if ( data.mobilePhone !== oldData.mobilePhone ) {
    if ( data.mobilePhone && !oldPhoneNumbers.includes(data.mobilePhone) ) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.mobilePhone,
        label: 'Mobile',
        is_primary: false
      })
    }
  }

  if ( !isEqual(data.homePhones, oldData.homePhones) ) {
    for ( const phone of data.homePhones ) {
      if ( !oldPhoneNumbers.includes(phone) ) {
        attributes.push({
          attribute_type: 'phone_number',
          text: phone,
          label: 'Home',
          is_primary: false
        })
      }
    }
  }

  if ( !isEqual(data.businessPhones, oldData.businessPhones) ) {
    for ( const phone of data.businessPhones ) {
      if ( !oldPhoneNumbers.includes(phone) ) {
        attributes.push({
          attribute_type: 'phone_number',
          text: phone,
          label: 'Work',
          is_primary: false
        })
      }
    }
  }


  const oldEmails   = refinedAtts.email ? (refinedAtts.email.map(entry => entry.text)) : []
  const map_1       = oldData.emailAddresses ? (oldData.emailAddresses.map(entry => entry.address)) : []
  const map_2       = data.emailAddresses ? (data.emailAddresses.map(entry => entry.address)) : []
  const emailsDiff  = getArrayDiff(map_1, map_2)

  for ( const email of emailsDiff ) {
    if ( !oldEmails.includes(email) ) {
      attributes.push({
        attribute_type: 'email',
        text: email,
        label: 'Other',
        is_primary: false
      })
    }
  }


  let maxIndex     = 1
  const addressArr = [...refinedAtts.postal_code || [], ...refinedAtts.street_name || [], ...refinedAtts.city || [], ...refinedAtts.country || [], ...refinedAtts.state || []]

  for ( const entry of addressArr ) {
    if ( Number(entry.index) > maxIndex )
      maxIndex = Number(entry.index)
  }

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


  const oldTags = refinedAtts.tag ? (refinedAtts.tag.map(entry => entry.text)) : []
  
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

const generateMContacts = (credential, contacts) => {
  return contacts.map(contact => {
    const clientData = [{
      key: `rechatCredential:${credential}`,
      value: `rechatContact:${contact.id}`
    }]

    const names = [{
      givenName: contact.first_name, //`specialxx-${contact.first_name}`,
      familyName: contact.last_name,
      middleName: contact.middle_name
    }]

    const nicknames = [{ value: contact.nickname }]

    let birthdays = []

    if (contact.birthday) {
      const birthday     = new Date(contact.birthday)
      const birthdayObj  = { year: birthday.getFullYear(), month: birthday.getMonth() + 1, day: birthday.getDate() }
      const birthdayText = `${birthdayObj.month}/${birthdayObj.day}/${birthdayObj.year}`
      
      birthdays = [{
        date: birthdayObj,
        text: birthdayText
      }]
    }

    const urls = contact.attributes.filter(a => a.attribute_type === 'website' ).map(a => {
      return {
        value: a.text
      }
    })

    let addresses = []

    if ( contact.address ) {
      addresses = contact.address.map(a => {
        return {
          type: a.extra,
          streetAddress: a.line1,
          city: a.city,
          region: a.state.toUpperCase(),
          postalCode: a.postcode,
          country: a.country || 'US',
          countryCode: a.country || 'US'
        }
      })
    }

    const emailAddresses = contact.attributes.filter(a => a.attribute_type === 'email' ).map(a => {
      return {
        type: a.label,
        value: a.text
      }
    })

    const phoneNumbers = contact.attributes.filter(a => a.attribute_type === 'phone_number' ).map(a => {
      return {
        type: a.label,
        value: a.text
      }
    })

    // Cannot have more than one person.biographies per source
    let biographies = []

    const primaryBiographies = contact.attributes.filter(a => a.attribute_type === 'note' && a.is_primary ).map(a => {
      return {
        contentType: 'TEXT_HTML',
        value: a.text
      }
    })

    const ordinaryBiographies = contact.attributes.filter(a => a.attribute_type === 'note' && !a.is_primary ).map(a => {
      return {
        contentType: 'TEXT_HTML',
        value: a.text
      }
    })

    if ( primaryBiographies.length ) {
      biographies = [primaryBiographies[0]]
    } else {
      biographies = [ordinaryBiographies[0]]
    }

    const organizations = [{ name: contact.company, title: contact.job_title }]

    return {
      contact: contact.id,

      resource: {
        clientData,
        names,
        nicknames,
        birthdays,
        urls,
        addresses,
        emailAddresses,
        phoneNumbers,
        biographies,
        organizations
      }
    }
  })
}


module.exports = {
  parseAttributes,
  findNewAttributes,
  generateMContacts
}