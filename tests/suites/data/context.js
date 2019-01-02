module.exports = {
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
  required: [
    'Selling',
    'Resale'
  ],
  optional: [],
  triggers_brokerwolf: true
}
