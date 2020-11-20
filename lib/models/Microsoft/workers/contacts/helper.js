const _  = require('lodash')


const getArrayDiff = (arr_1, arr_2) => {
  const a_1 = [...new Set(arr_1)]
  const a_2 = [...new Set(arr_2)]

  const a    = []
  const diff = []

  for (let i = 0; i < a_1.length; i++)
    a[a_1[i]] = true

  for (let i = 0; i < a_2.length; i++) {
    if (a[a_2[i]]) 
      delete a[a_2[i]]
    else
      a[a_2[i]] = true
  }

  for (const k in a)
    diff.push(k)

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

  if (key === 'photo') {
    if (data.photo) {
      attributes.push({ attribute_type: 'profile_image_url', text: data.photo })
      attributes.push({ attribute_type: 'cover_image_url', text: data.photo })
    }
  }

  if (key === 'parentFolderId') {
    if ( contactFolders && data.parentFolderId ) {
      if (contactFolders[data.parentFolderId])
        attributes.push({ attribute_type: 'tag', text: contactFolders[data.parentFolderId] })
    }
  }

  if (key === 'birthday') {
    if (data.birthday) {
      const birthday = new Date(data.birthday)

      attributes.push({
        attribute_type: 'birthday',
        date: birthday.getTime() / 1000
      })
    }
  }

  if (key === 'jobTitle') {
    if (data.jobTitle)
      attributes.push({ attribute_type: 'job_title', text: data.jobTitle })
  }

  if (key === 'companyName') {
    if (data.companyName)
      attributes.push({ attribute_type: 'company', text: data.companyName })
  }

  if (key === 'businessHomePage') {
    if (data.businessHomePage)
      attributes.push({ attribute_type: 'website', text: data.businessHomePage })
  }

  if (key === 'personalNotes') {
    if (data.personalNotes)
      attributes.push({ attribute_type: 'note', text: data.personalNotes })
  }

  if (key === 'mobilePhone') {
    if (data.mobilePhone) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.mobilePhone,
        label: 'Mobile',
        is_primary: false
      })
    }
  }

  if (key === 'homePhones') {
    for (let i = 0; i < data.homePhones.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.homePhones[i],
        label: 'Home',
        is_primary: i === 0 ? true : false
      })
    }
  }

  if (key === 'businessPhones') {
    for (let i = 0; i < data.businessPhones.length; i++) {
      attributes.push({
        attribute_type: 'phone_number',
        text: data.businessPhones[i],
        label: 'Work',
        is_primary: i === 0 ? true : false
      })
    }
  }
  
  if (key === 'homeAddress') {
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

  if (key === 'businessAddress') {
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

  if (key === 'otherAddress') {
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

  if (key === 'emailAddresses') {
    for (let i = 0; i < data.emailAddresses.length; i++) {
      attributes.push({
        attribute_type: 'email',
        text: data.emailAddresses[i]['address'],
        label: 'Other',
        is_primary: i === 0 ? true : false
      })
    }
  }

  if (key === 'categories') {
    for (let i = 0; i < data.categories.length; i++) {
      attributes.push({
        attribute_type: 'tag',
        text: data.categories[i]
      })
    }
  }


  return attributes
}

const findNewAttributes = (contact, oldAttributes) => {
  const deletedAtt  = []
  const rawData     = contact.rawData
  const oldRawData  = contact.oldRawData
  const refinedAtts = _.groupBy(oldAttributes, function(entry) { return entry.attribute_type })

  /** @type {IContactAttributeInput[]} */
  const attributes = []

  // Singular Attributes
  if ( rawData.givenName !== oldRawData.givenName ) {
    const firstNameAtt = refinedAtts.first_name ? (refinedAtts.first_name.length ? refinedAtts.first_name[0].text : null) : null

    if ( rawData.givenName && !firstNameAtt ) {
      attributes.push({ attribute_type: 'first_name', text: rawData.givenName })
    }
  }

  if ( rawData.surname !== oldRawData.surname ) {
    const lastNameAtt = refinedAtts.last_name ? (refinedAtts.last_name.length ? refinedAtts.last_name[0].text : null) : null

    if ( rawData.surname && !lastNameAtt ) {
      attributes.push({ attribute_type: 'last_name', text: rawData.surname })
    }
  }

  if ( rawData.middleName !== oldRawData.middleName ) {
    const middleNameAtt = refinedAtts.middle_name ? (refinedAtts.middle_name.length ? refinedAtts.middle_name[0].text : null) : null

    if ( rawData.middleName && !middleNameAtt ) {
      attributes.push({ attribute_type: 'middle_name', text: rawData.middleName })
    }
  }

  if ( rawData.nickName !== oldRawData.nickName ) {
    const nickNameAtt = refinedAtts.nickname ? (refinedAtts.nickname.length ? refinedAtts.nickname[0].text : null) : null

    if ( rawData.nickName && !nickNameAtt ) {
      attributes.push({ attribute_type: 'nickname', text: rawData.nickName })
    }
  }

  if ( rawData.title !== oldRawData.title ) {
    const titleAtt = refinedAtts.title ? (refinedAtts.title.length ? refinedAtts.title[0].text : null) : null

    if ( rawData.title && !titleAtt ) {
      attributes.push({ attribute_type: 'title', text: rawData.title })
    }
  }

  if ( rawData.spouseName !== oldRawData.spouseName ) {
    let spouseNameAtt = null

    if ( refinedAtts.first_name ) {
      for ( const att of refinedAtts.first_name ) {
        if ( att.is_partner ) {
          spouseNameAtt = att.text
        }
      }
    }

    if ( rawData.spouseName && !spouseNameAtt ) {
      attributes.push({ attribute_type: 'first_name', text: rawData.spouseName, is_partner: true })
    }
  }

  if ( rawData.jobTitle !== oldRawData.jobTitle ) {
    const jobTitleAtt = refinedAtts.job_title ? (refinedAtts.job_title.length ? refinedAtts.job_title[0].text : null) : null

    if ( rawData.jobTitle && !jobTitleAtt ) {
      attributes.push({ attribute_type: 'job_title', text: rawData.jobTitle })
    }
  }

  if ( rawData.companyName !== oldRawData.companyName ) {
    const companyAtt = refinedAtts.company ? (refinedAtts.company.length ? refinedAtts.company[0].text : null) : null

    if ( rawData.companyName && !companyAtt ) {
      attributes.push({ attribute_type: 'company', text: rawData.companyName })
    }
  }


  if ( rawData.birthday !== oldRawData.birthday ) {
    const birthdayAtt = refinedAtts.birthday ? (refinedAtts.birthday.length ? refinedAtts.birthday[0].date : null) : null

    if (rawData.birthday && !birthdayAtt) {
      const birthday = new Date(rawData.birthday)
      attributes.push({ attribute_type: 'birthday', date: birthday.getTime() / 1000 })
    }
  }

  if ( rawData.businessHomePage !== oldRawData.businessHomePage ) {
    const websiteeAtt = refinedAtts.website ? (refinedAtts.website.length ? refinedAtts.website[0].text : null) : null

    if ( rawData.businessHomePage && !websiteeAtt ) {
      attributes.push({ attribute_type: 'website', text: rawData.businessHomePage })
    }
  }



  // None Singulr Attributes
  if ( rawData.personalNotes !== oldRawData.personalNotes ) {
    if (rawData.personalNotes) {
      attributes.push({ attribute_type: 'note', text: rawData.personalNotes })
    }
  }


  const oldPhoneNumbers = refinedAtts.phone_number ? (refinedAtts.phone_number.map(entry => entry.text)) : []

  if ( rawData.mobilePhone !== oldRawData.mobilePhone ) {
    if ( rawData.mobilePhone && !oldPhoneNumbers.includes(rawData.mobilePhone) ) {
      attributes.push({
        attribute_type: 'phone_number',
        text: rawData.mobilePhone,
        label: 'Mobile',
        is_primary: false
      })
    }
  }

  if ( !_.isEqual(rawData.homePhones, oldRawData.homePhones) ) {
    for ( const phone of rawData.homePhones ) {
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

  if ( !_.isEqual(rawData.businessPhones, oldRawData.businessPhones) ) {
    for ( const phone of rawData.businessPhones ) {
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
  const map_1       = oldRawData.emailAddresses ? (oldRawData.emailAddresses.map(entry => entry.address)) : []
  const map_2       = rawData.emailAddresses ? (rawData.emailAddresses.map(entry => entry.address)) : []
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

  if ( !_.isEqual(rawData.homeAddress, oldRawData.homeAddress) ) {
    maxIndex ++

    if (rawData.homeAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: rawData.homeAddress.street,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.homeAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: rawData.homeAddress.city,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }

    if (rawData.homeAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: rawData.homeAddress.state,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.homeAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: rawData.homeAddress.countryOrRegion,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  
    if (rawData.homeAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: rawData.homeAddress.postalCode,
        label: 'Home',
        index: maxIndex,
        is_primary: true
      })
    }
  }

  if ( !_.isEqual(rawData.businessAddress, oldRawData.businessAddress) ) {
    maxIndex ++

    if (rawData.businessAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: rawData.businessAddress.street,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (rawData.businessAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: rawData.businessAddress.city,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }

    if (rawData.businessAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: rawData.businessAddress.state,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (rawData.businessAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: rawData.businessAddress.countryOrRegion,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (rawData.businessAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: rawData.businessAddress.postalCode,
        label: 'Work',
        index: maxIndex,
        is_primary: false
      })
    }
  }

  if ( !_.isEqual(rawData.otherAddress, oldRawData.otherAddress) ) {
    maxIndex ++

    if (rawData.otherAddress.street) {
      attributes.push({
        attribute_type: 'street_name',
        text: rawData.otherAddress.street,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (rawData.otherAddress.city) {
      attributes.push({
        attribute_type: 'city',
        text: rawData.otherAddress.city,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }

    if (rawData.otherAddress.state) {
      attributes.push({
        attribute_type: 'state',
        text: rawData.otherAddress.state,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (rawData.otherAddress.countryOrRegion) {
      attributes.push({
        attribute_type: 'country',
        text: rawData.otherAddress.countryOrRegion,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  
    if (rawData.otherAddress.postalCode) {
      attributes.push({
        attribute_type: 'postal_code',
        text: rawData.otherAddress.postalCode,
        label: 'Other',
        index: maxIndex,
        is_primary: false
      })
    }
  }


  const oldTags = refinedAtts.tag ? (refinedAtts.tag.map(entry => entry.text)) : []
  
  if ( !_.isEqual(rawData.categories, oldRawData.categories) ) {

    if (refinedAtts.tag) {
      for ( let i = 0; i < refinedAtts.tag.length; i++ ) {
        if ( !rawData.categories.includes(refinedAtts.tag[i].text) ) {
          deletedAtt.push(refinedAtts.tag[i].id)
        }
      }
    }

    for ( const tag of rawData.categories ) {
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