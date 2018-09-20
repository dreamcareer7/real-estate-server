const contact = {
  attributes: [
    {
      attribute_type: 'email',
      text: 'john@doe.org',
      label: 'Work',
      is_primary: true
    },
    {
      attribute_type: 'phone_number',
      text: '+989124834198',
      label: 'Mobile',
      is_primary: true
    },
    {
      attribute_type: 'first_name',
      text: 'John'
    },
    {
      attribute_type: 'middle_name',
      text: 'M.'
    },
    {
      attribute_type: 'last_name',
      text: 'Doe'
    },
    {
      attribute_type: 'nickname',
      text: 'Johnny'
    },
    {
      attribute_type: 'tag',
      text: 'New'
    },
    {
      attribute_type: 'tag',
      text: 'foo'
    },
    {
      attribute_type: 'birthday',
      date: 1000000
    },
    {
      attribute_type: 'profile_image_url',
      text:
        'https://inomics.com/sites/default/files/pictures/picture-95970-1460131169.png'
    },
    {
      attribute_type: 'cover_image_url',
      text:
        'https://inomics.com/sites/default/files/pictures/picture-95970-1460131169.png'
    },
    {
      attribute_type: 'company',
      text: 'Rechat'
    },
    {
      attribute_type: 'street_name',
      text: 'Street',
      is_primary: true,
      label: 'Office'
    },
    {
      attribute_type: 'city',
      text: 'Dallas',
      is_primary: true,
      label: 'Office'
    },
    {
      attribute_type: 'state',
      text: 'Texas',
      is_primary: true,
      label: 'Office'
    },
    {
      attribute_type: 'country',
      text: 'US',
      is_primary: true,
      label: 'Office'
    },
    {
      attribute_type: 'postal_code',
      text: '72890',
      is_primary: true,
      label: 'Office'
    },
    {
      attribute_type: 'source_type',
      text: 'ExplicitlyCreated'
    },
    {
      attribute_type: 'note',
      text: 'This is a sample note'
    },
    {
      attribute_type: 'job_title',
      text: 'Contact Test Subject'
    },
    {
      label: 'Personal',
      attribute_type: 'website',
      text: 'http://www.gholi.com'
    }
  ]
}

const companyContact = {
  attributes: [
    {
      attribute_type: 'company',
      text: 'ACME Corporation'
    }
  ]
}

module.exports = {
  contact,
  companyContact
}
