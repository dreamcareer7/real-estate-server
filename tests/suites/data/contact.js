const contact = {
  attributes: [
    {
      type: 'email',
      text: 'john@doe.org',
      label: 'Work',
      is_primary: true
    },
    {
      type: 'phone_number',
      text: '+989124834198',
      label: 'Mobile',
      is_primary: true
    },
    {
      type: 'first_name',
      text: 'John'
    },
    {
      type: 'middle_name',
      text: 'M.'
    },
    {
      type: 'last_name',
      text: 'Doe'
    },
    {
      type: 'nickname',
      text: 'Johnny'
    },
    {
      type: 'tag',
      text: 'New'
    },
    {
      type: 'tag',
      text: 'foo'
    },
    {
      type: 'stage',
      text: 'Contact'
    },
    {
      type: 'birthday',
      date: 1000000
    },
    {
      type: 'profile_image_url',
      text:
        'https://inomics.com/sites/default/files/pictures/picture-95970-1460131169.png'
    },
    {
      type: 'cover_image_url',
      text:
        'https://inomics.com/sites/default/files/pictures/picture-95970-1460131169.png'
    },
    {
      type: 'company',
      text: 'Rechat'
    },
    {
      type: 'street_name',
      text: 'Street',
      is_primary: true,
      label: 'Office'
    },
    {
      type: 'city',
      text: 'Dallas',
      is_primary: true,
      label: 'Office'
    },
    {
      type: 'state',
      text: 'Texas',
      is_primary: true,
      label: 'Office'
    },
    {
      type: 'country',
      text: 'US',
      is_primary: true,
      label: 'Office'
    },
    {
      type: 'zip_code',
      text: '72890',
      is_primary: true,
      label: 'Office'
    },
    {
      type: 'source_type',
      text: 'ExplicitlyCreated'
    },
    {
      type: 'note',
      text: 'This is a sample note'
    },
    {
      type: 'job_title',
      text: 'Contact Test Subject'
    },
    {
      label: 'Personal',
      type: 'website',
      text: 'http://www.gholi.com'
    }
  ]
}

const companyContact = {
  attributes: [
    {
      type: 'company',
      text: 'ACME Corporation'
    }
  ]
}

module.exports = {
  contact,
  companyContact
}
