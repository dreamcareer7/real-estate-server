module.exports = {
  list_date: {
    label: 'List Date',
    short_label: 'LST',
    key: 'list_date',
    section: 'Dates',
    needs_approval: true,
    exports: true,
    preffered_source: 'MLS',
    default_value: null,
    data_type: 'Date',
    format: null,
    triggers_brokerwolf: true,
    order: 1
  },

  contract_status: {
    label: 'Contact Date',
    key: 'contract_status',
    needs_approval: true,
    default_value: null,
    data_type: 'Text',
    preffered_source: 'Provided',
    order: 2,
    triggers_brokerwolf: true
  }
}
