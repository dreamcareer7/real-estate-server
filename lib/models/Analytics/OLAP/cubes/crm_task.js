module.exports = {
  name: 'crm_tasks',
  fact_table: 'crm_tasks',
  dimensions: [
    {
      name: 'task_type',
      label: 'Type',
      data_type: 'text'
    },
    {
      name: 'status',
      label: 'Status'
    },
    {
      name: 'created_by',
      label: 'Created By',
      data_type: 'uuid',
      type: 'team_member'
    },
    {
      name: 'created_at',
      label: 'Created At',
      type: 'date',
      data_type: 'timestamptz',
      levels: [{
        name: 'month',
        expression: 'date_trunc(\'month\', created_at)'
      }, {
        name: 'week',
        expression: 'date_trunc(\'week\', created_at)'
      }, {
        name: 'day',
        expression: 'date_trunc(\'day\', created_at)'
      }]
    },
    {
      name: 'due_date',
      label: 'Created At',
      type: 'date',
      data_type: 'timestamptz',
      levels: [{
        name: 'month',
        expression: 'date_trunc(\'month\', due_date)'
      }, {
        name: 'week',
        expression: 'date_trunc(\'week\', due_date)'
      }, {
        name: 'day',
        expression: 'date_trunc(\'day\', due_date)'
      }]
    },
  ],
  aggregates: [
    {
      name: 'count',
      fn: 'count(*)::int'
    }
  ]
}
