module.exports = {
  fact_table: 'analytics.deals',
  dimensions: [
    {
      name: 'closing_date',
      type: 'date',
      data_type: 'timestamptz',
      levels: [
        {
          name: 'year'
        },
        {
          name: 'quarter'
        },
        {
          name: 'month'
        },
        {
          name: 'week'
        },
        {
          name: 'day'
        }
      ]
    },
    {
      name: 'list_date',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'expiration_date',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'contract_date',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'option_period',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'financing_due',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'title_due',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 't47_due',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'possession_date',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'lease_executed',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'lease_application_date',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'lease_begin',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      name: 'lease_end',
      type: 'date',
      data_type: 'timestamptz'
    },
    {
      data_type: 'listing_status',
      name: 'listing_status'
    },
    {
      data_type: 'property_type',
      name: 'property_type'
    },
    {
      data_type: 'deal_type',
      name: 'deal_type'
    },
    {
      data_type: 'uuid',
      name: 'brand'
    },
    {
      data_type: 'boolean',
      name: 'has_rejection'
    }
  ],
  aggregates: [
    {
      name: 'count',
      fn: 'count(*)::int'
    },
    {
      name: 'total_sales_price',
      fn: 'sum(sales_price)'
    },
    {
      name: 'total_leased_price',
      fn: 'sum(leased_price)'
    }
  ]
}
