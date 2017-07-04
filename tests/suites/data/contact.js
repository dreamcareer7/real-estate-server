module.exports = {
  attributes: {
    emails: [
      {
        type: 'email',
        email: 'john@doe.org'
      }
    ],
    phone_numbers: [
      {
        type: 'phone_number',
        phone_number: '+989124834198'
      }
    ],
    names: [
      {
        type: 'name',
        first_name: 'John',
        last_name: 'Doe'
      }
    ],
    tags: [
      {
        type: 'tag',
        tag: 'New'
      }
    ],
    stages: [
      {
        type: 'stage',
        stage: 'Contact'
      },
      {
        type: 'stage',
        stage: 'UnqualifiedLead'
      },
      {
        type: 'stage',
        stage: 'QualifiedLead'
      },
      {
        type: 'stage',
        stage: 'Active'
      },
      {
        type: 'stage',
        stage: 'Customer'
      },
      {
        type: 'stage',
        stage: 'General'
      }
    ],
    birthdays: [
      {
        type: 'birthday',
        birthday: 1000000
      }
    ],
    profile_image_urls: [
      {
        type: 'profile_image_url',
        profile_image_url: 'https://inomics.com/sites/default/files/pictures/picture-95970-1460131169.png'
      }
    ],
    cover_image_urls: [
      {
        type: 'cover_image_url',
        cover_image_url: 'https://inomics.com/sites/default/files/pictures/picture-95970-1460131169.png'
      }
    ],
    companies: [
      {
        type: 'company',
        company: 'Rechat'
      }
    ],
    addresses: [
      {
        type: 'address',
        address: {
          street_name: 'Street',
          city: 'Dallas',
          state: 'Texas',
          country: 'US',
          postal_code: '72890'
        }
      }
    ],
    source_types: [
      {
        type: 'source_type',
        source_type: 'BrokerageWidget'
      },
      {
        type: 'source_type',
        source_type: 'IOSAddressBook'
      },
      {
        type: 'source_type',
        source_type: 'SharesRoom'
      },
      {
        type: 'source_type',
        source_type: 'ExplicitlyCreated'
      }
    ],
    notes: [
      {
        type: 'note',
        note: 'This is a sample note'
      }
    ]
  }
}
