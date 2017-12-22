Deal.contexts = {
  list_date: {
    type: 'Date',
  },

  list_price: {
    type: 'Number'
  },

  sales_price: {
    type: 'Number',
    brokerwolf: true
  },

  expiration_date: {
    type: 'Date'
  },

  closing_date: {
    type: 'Date',
    brokerwolf: true
  },

  contract_date: {
    type: 'Date'
  },

  full_address: {
    type: 'Text'
  },

  legal_description: {
    type: 'Text'
  },

  unit_number: {
    type: 'Text',
    property_types: [
      Deal.RELASE,
      Deal.NEW_HOME,
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
      Deal.COMMERCIAL_SALE
    ]
  },

  building_number: {
    type: 'Text',
    property_types: [
      Deal.RELASE,
      Deal.NEW_HOME,
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
      Deal.COMMERCIAL_SALE
    ]
  },

  project_name: {
    type: 'Text'
  },

  lot_number: {
    type: 'Text'
  },

  block_number: {
    type: 'Text'
  },

  subdivision: {
    type: 'Text'
  },

  street_number: {
    type: 'Text'
  },

  street_dir_prefix: {
    type: 'Text'
  },

  street_name: {
    type: 'Text'
  },

  street_suffix: {
    type: 'Text'
  },

  street_address: {
    type: 'Text'
  },

  city: {
    type: 'Text'
  },

  state: {
    type: 'Text'
  },

  state_code: {
    type: 'Text'
  },

  postal_code: {
    type: 'Text'
  },

  county: {
    type: 'Text'
  },

  year_built: {
    type: 'Number',
    property_types: [
      Deal.RELASE,
      Deal.NEW_HOME,
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
      Deal.COMMERCIAL_SALE
    ]
  },

  seller_name: {
    type: 'Text'
  },

  buyer_name: {
    type: 'Text'
  },

  listing_status: {
    type: 'Text'
  },

  mls_number: {
    type: 'Number'
  },

  mls_area_major: {
    type: 'Text'
  },

  mls_area_minor: {
    type: 'Text'
  },

  file_id: {
    type: 'Text'
  },

  commission_listing: {
    type: 'Number'
  },

  commission_selling: {
    type: 'Number'
  },

  property_type: {
    type: 'Text'
  },

  transaction_type: {
    type: 'Number'
  },

  square_meters: {
    type: 'Number'
  },

  list_agent_full_name: {
    type: 'Text'
  },

  list_agent_direct_work_phone: {
    type: 'Text'
  },

  list_agent_email: {
    type: 'Text'
  },

  selling_agent_full_name: {
    type: 'Text'
  },

  co_selling_agent_direct_work_phone: {
    type: 'Text'
  },

  co_selling_agent_email: {
    type: 'Text'
  },

  option_period: {
    type: 'Date',
    property_types: [
      Deal.RELASE,
      Deal.NEW_HOME,
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
      Deal.COMMERCIAL_SALE
    ]
  },

  financing_due: {
    type: 'Date',
    property_types: [
      Deal.RELASE,
      Deal.NEW_HOME,
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
      Deal.COMMERCIAL_SALE
    ]
  },

  title_due: {
    type: 'Date',
    property_types: [
      Deal.RELASE,
      Deal.NEW_HOME,
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
      Deal.COMMERCIAL_SALE
    ]
  },

  t47_due: {
    type: 'Date',
    property_types: [
      Deal.RELASE,
      Deal.NEW_HOME,
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
      Deal.COMMERCIAL_SALE
    ]
  },

  contract_expiration: {
    type: 'Date',
    property_types: [
      Deal.RELASE,
      Deal.NEW_HOME,
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
      Deal.COMMERCIAL_SALE
    ]
  },

  lease_executed: {
    type: 'Date',
    property_types: [
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
    ]
  },

  lease_application_date: {
    type: 'Date',
    property_types: [
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
    ]
  },

  lease_execution_date: {
    type: 'Date',
    property_types: [
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
    ]
  },

  lease_begin: {
    type: 'Date',
    property_types: [
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
    ]
  },

  lease_end: {
    type: 'Date',
    property_types: [
      Deal.RESIDENTIAL_LEASE,
      Deal.COMMERCIAL_LEASE,
    ]
  },

  title_company: {
    type: 'Text',
    property_types: [
      Deal.RESALE,
      Deal.NEW_HOME,
      Deal.LOT,
      Deal.COMMERCIAL_SALE
    ]
  },

  ender_type: {
    type: 'Text'
  }
}