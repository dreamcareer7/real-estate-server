const Sections = {
  DATES: 'CriticalDates',
  LISTING: 'Listing',
  CDA: 'CDA'
}

const Flags = {}

Flags.SELLING = 1
Flags.BUYING = 2

Flags.ALL_DEAL_TYPES = Flags.Selling | Flags.Buying

// Flags 4-64 are reserved for possible upcoming property deal types

Flags.RESALE = 128
Flags.NEW_HOME = 256
Flags.LOT = 512
Flags.COMMERCIAL_SALE = 1024
Flags.RESIDENTIAL_LEASE = 2048
Flags.COMMERCIAL_LEASE = 4096

Flags.ALL_PROPERTY_TYPES = Flags.RESALE | Flags.NEW_HOME | Flags.LOT |
                         Flags.RESIDENTIAL_LEASE | Flags.COMMERCIAL_SALE | Flags.COMMERCIAL_LEASE

Flags.ALL_BUT_LEASES = Flags.ALL_PROPERTY_TYPES ^ Flags.COMMERCIAL_LEASE ^ Flags.RESIDENTIAL_LEASE

Flags.ALL = Flags.ALL_DEAL_TYPES | Flags.ALL_PROPERTY_TYPES

Deal.contexts = {
  list_date: {
    type: 'Date',
    section: Sections.DATES,
    label: 'Listing Start Date',
    show_on_fact_sheet: Flags.SELLING | Flags.ALL_BUT_LEASES,
    required: Flags.SELLING | Flags.ALL_BUT_LEASES
  },

  list_price: {
    type: 'Number',
    label: 'Original Price',
    section: Sections.LISTING,
    show_on_fact_sheet: Flags.SELLING | Flags.ALL_PROPERTY_TYPES,
    required: Flags.SELLING | Flags.ALL_BUT_LEASES,
  },

  sales_price: {
    type: 'Number',
    label: 'Sales Price',
    brokerwolf: true,
    section: Sections.CDA,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES
  },

  expiration_date: {
    type: 'Date',
    label: 'Listing Expiration',
    section: Sections.DATES,
    required: Flags.SELLING | Flags.ALL_BUT_LEASES
  },

  closing_date: {
    type: 'Date',
    label: 'Closing Date',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    brokerwolf: true
  },

  contract_date: {
    type: 'Date',
    label: 'Executed Date',
    section: Sections.DATES,
    required: Flags.BUYING | Flags.ALL_BUT_LEASES,
  },

  full_address: {
    type: 'Text',
  },

  legal_description: {
    type: 'Text'
  },

  unit_number: {
    type: 'Text',
  },

  building_number: {
    type: 'Text'
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
    label: 'Year Built',
    section: Sections.DATES,
    optional: Flags.ALL_DEAL_TYPES | Flags.ALL_PROPERTY_TYPES ^ Flags.LOT
  },
  listing_status: {
    type: 'Text',
    label: 'Status',
    optional: Flags.BUYING | Flags.ALL_PROPERTY_TYPES
  },

  mls_number: {
    type: 'Number',
    label: 'MLS#',
    optional: Flags.ALL_DEAL_TYPES | Flags.BUYING
  },

  mls_area_major: {
    type: 'Text'
  },

  mls_area_minor: {
    type: 'Text'
  },

  file_id: {
    type: 'Text',
    section: Sections.LISTING
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

  square_meters: {
    type: 'Number'
  },

  option_period: {
    type: 'Date',
    label: 'End Of Option',
    section: Sections.DATES,
    required: Flags.BUYING | Flags.ALL_BUT_LEASES,
  },

  financing_due: {
    type: 'Date',
    label: 'Financing Due',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
  },

  title_due: {
    type: 'Date',
    label: 'Title Due',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
  },

  t47_due: {
    type: 'Date',
    label: 'Survey Due',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
  },

  contract_expiration: {
    type: 'Date',
  },

  lease_executed: {
    type: 'Date',

  },

  lease_application_date: {
    type: 'Date',
  },

  lease_execution_date: {
    type: 'Date',
  },

  lease_begin: {
    type: 'Date',
  },

  lease_end: {
    type: 'Date',
  },

  title_company: {
    type: 'Text',
  },

  ender_type: {
    type: 'Text'
  }
}