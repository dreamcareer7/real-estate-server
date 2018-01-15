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
    required: Flags.SELLING | Flags.ALL_BUT_LEASES,
    export: true
  },

  list_price: {
    type: 'Number',
    label: 'Original Price',
    section: Sections.LISTING,
    show_on_fact_sheet: Flags.SELLING | Flags.ALL_PROPERTY_TYPES,
    required: Flags.SELLING | Flags.ALL_BUT_LEASES,
    needs_approval: true,
    export: true
  },

  sales_price: {
    type: 'Number',
    label: 'Sales Price',
    brokerwolf: true,
    section: Sections.CDA,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    needs_approval: true,
    export: true
  },

  expiration_date: {
    type: 'Date',
    label: 'Listing Expiration',
    short_label: 'Exp',
    section: Sections.DATES,
    required: Flags.SELLING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.SELLING | Flags.ALL_BUT_LEASES,
    needs_approval: true,
    export: true
  },

  closing_date: {
    type: 'Date',
    label: 'Closing Date',
    short_label: 'Cls',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    brokerwolf: true,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    needs_approval: true,
    export: true
  },

  possession_date: {
    type: 'Date',
    label: 'Possession Date',
    short_label: 'Pos',
    section: Sections.DATES,
    required: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    needs_approval: true,
    export: true
  },

  contract_date: {
    type: 'Date',
    label: 'Executed Date',
    short_label: 'Off',
    section: Sections.DATES,
    required: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    needs_approval: true,
    export: true
  },

  full_address: {
    type: 'Text',
    label: 'Full Address',
    export: true
  },

  legal_description: {
    type: 'Text',
    label: 'Legal Description',
    export: true
  },

  unit_number: {
    type: 'Text',
    label: 'Unit Numbers',
    export: true
  },

  building_number: {
    type: 'Text',
    label: 'Building Numbers',
    export: true
  },

  project_name: {
    type: 'Text',
    label: 'Project Name',
    export: true
  },

  lot_number: {
    type: 'Text',
    label: 'Lot Number',
    export: true
  },

  block_number: {
    type: 'Text',
    label: 'Block Number',
    export: true
  },

  subdivision: {
    type: 'Text',
    label: 'Subdivision',
    export: true
  },

  street_number: {
    type: 'Text',
    label: 'Street Number',
    export: true
  },

  street_dir_prefix: {
    type: 'Text',
    label: 'Street Dir Prefix',
    export: true
  },

  street_name: {
    type: 'Text',
    label: 'Street Name',
    export: true
  },

  street_suffix: {
    type: 'Text',
    label: 'Street Suffix',
    export: true
  },

  street_address: {
    type: 'Text',
    label: 'Street Address',
    export: true
  },

  city: {
    type: 'Text',
    label: 'City',
    export: true
  },

  state: {
    type: 'Text',
    label: 'State',
    export: true
  },

  state_code: {
    type: 'Text',
    label: 'State Code',
    export: true
  },

  postal_code: {
    type: 'Text',
    label: 'Postal Code',
    export: true
  },

  county: {
    type: 'Text',
    label: 'Country',
    export: true
  },

  year_built: {
    type: 'Number',
    label: 'Year Built',
    section: Sections.LISTING,
    optional: Flags.ALL_DEAL_TYPES | Flags.ALL_PROPERTY_TYPES ^ Flags.LOT,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ALL_PROPERTY_TYPES ^ Flags.LOT,
    export: true
  },

  listing_status: {
    type: 'Text',
    label: 'Status',
    export: true
  },

  mls_number: {
    type: 'Number',
    label: 'MLS#',
    optional: Flags.ALL_DEAL_TYPES | Flags.BUYING,
    export: true
  },

  mls_area_major: {
    type: 'Text',
    label: 'MLS Major Area',
    export: true
  },

  mls_area_minor: {
    type: 'Text',
    label: 'MLS Area Minor',
    export: true
  },

  file_id: {
    type: 'Text',
    label: 'File ID',
    section: Sections.LISTING,
    export: true
  },

  commission_listing: {
    type: 'Number',
    needs_approval: true,
    label: 'Commission Listing',
    export: true
  },

  commission_selling: {
    type: 'Number',
    needs_approval: true,
    label: 'Commission Selling',
    export: true
  },

  property_type: {
    type: 'Text',
    label: 'Property Type',
    export: true
  },

  square_meters: {
    type: 'Number',
    label: 'Square Meters',
    export: true
  },

  option_period: {
    type: 'Date',
    label: 'End Of Option',
    short_label: 'Opt',
    section: Sections.DATES,
    required: Flags.BUYING | Flags.ALL_BUT_LEASES,
    needs_approval: true,
    export: true
  },

  financing_due: {
    type: 'Date',
    label: 'Financing Due',
    short_label: 'Fin',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    export: true
  },

  title_due: {
    type: 'Date',
    label: 'Title Due',
    short_label: 'Til',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    export: true
  },

  t47_due: {
    type: 'Date',
    label: 'Survey Due',
    short_label: 'T47',
    section: Sections.DATES,
    optional: Flags.BUYING | Flags.ALL_BUT_LEASES,
    show_on_fact_sheet: Flags.ALL_DEAL_TYPES | Flags.ACTIVE_OFFER | Flags.ALL_BUT_LEASES,
    export: true
  },

  contract_expiration: {
    type: 'Date',
    label: 'Contract Expiration',
    export: true
  },

  lease_executed:
    {
      type: 'Date',
      label: 'Lease Executed',
      export: true

    },

  lease_application_date: {
    type: 'Date',
    label: 'Lease Application Date',
    export: true
  },

  lease_execution_date: {
    type: 'Date',
    label: 'Lease Execution Date',
    export: true
  },

  lease_begin: {
    type: 'Date',
    label: 'Lease Begin',
    export: true
  },

  lease_end: {
    type: 'Date',
    label: 'Lease End',
    export: true
  },

  title_company: {
    type: 'Text',
    label: 'Title Company',
    export: true
  },

  ender_type: {
    type: 'Text',
    label: 'Ender Type',
    export: true
  }
}