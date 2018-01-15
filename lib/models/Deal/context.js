const Sections = {
  DATES: 'CriticalDates',
  LISTING: 'Listing',
  CDA: 'CDA'
}

const Flags = {}

Flags.SELLING = 1
Flags.BUYING = 2

Flags.ALL_DEAL_TYPES = Flags.SELLING | Flags.BUYING

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

Flags.ACTIVE_OFFER = 131072


Deal.contexts = {
  list_date: {
    type: 'Date',
    section: Sections.DATES,
    label: 'Listing Start Date',
    short_label: 'Lst',
    needs_approval: true,
    show_on_fact_sheet: Flags.SELLING | Flags.ALL_BUT_LEASES,
    required: Flags.SELLING | Flags.ALL_BUT_LEASES
  },

  list_price: {
    type: 'Number',
    label: 'Original Price',
    section: Sections.LISTING,
    show_on_fact_sheet: Flags.SELLING | Flags.ALL_PROPERTY_TYPES,
    required: Flags.SELLING | Flags.ALL_BUT_LEASES,
    needs_approval: true
  },

  sales_price: {
    type: 'Number',
    label: 'Sales Price',
    brokerwolf: true,
    section: Sections.CDA,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    needs_approval: true
  },

  expiration_date: {
    type: 'Date',
    label: 'Listing Expiration',
    short_label: 'Exp',
    section: Sections.DATES,
    required: Flags.SELLING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.SELLING | Flags.ALL_BUT_LEASES,
    needs_approval: true,
  },

  closing_date: {
    type: 'Date',
    label: 'Closing Date',
    short_label: 'Cls',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    brokerwolf: true,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    needs_approval: true
  },

  possession_date: {
    type: 'Date',
    label: 'Possession Date',
    short_label: 'Pos',
    section: Sections.DATES,
    required: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    needs_approval: true
  },

  contract_date: {
    type: 'Date',
    label: 'Executed Date',
    short_label: 'Off',
    section: Sections.DATES,
    required: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    needs_approval: true
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
    section: Sections.LISTING,
    optional: Flags.ALL_DEAL_TYPES | Flags.ALL_PROPERTY_TYPES ^ Flags.LOT,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ALL_PROPERTY_TYPES ^ Flags.LOT
  },
  listing_status: {
    type: 'Text',
    label: 'Status',
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
    label: 'File ID',
    section: Sections.LISTING
  },

  commission_listing: {
    type: 'Number',
    needs_approval: true
  },

  commission_selling: {
    type: 'Number',
    needs_approval: true
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
    short_label: 'Opt',
    section: Sections.DATES,
    required: Flags.BUYING | Flags.ALL_BUT_LEASES,
    needs_approval: true
  },

  financing_due: {
    type: 'Date',
    label: 'Financing Due',
    short_label: 'Fin',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
  },

  title_due: {
    type: 'Date',
    label: 'Title Due',
    short_label: 'Til',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
  },

  t47_due: {
    type: 'Date',
    label: 'Survey Due',
    short_label: 'T47',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
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