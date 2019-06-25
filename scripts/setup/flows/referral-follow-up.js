const HOUR = 3600
const DAY = 24 * HOUR

module.exports = {
  name: 'Referral Follow-up',
  description: 'Referral Follow-up',
  steps: [
    {
      title: 'Thank you card',
      description:
        'Thank you card',
      due_in: 8 * HOUR,
      event: {
        title: 'Thank you card',
        task_type: 'Mail'
      },
      is_automated: false
    },
    {
      title: 'Thank you by phone',
      description: 'Thank you by phone',
      due_in: 8 * HOUR,
      event: {
        title: 'Thank you by phone',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Update on initial contact',
      description: 'Let them know after initial contact is made',
      due_in: DAY + 8 * HOUR,
      event: {
        title: 'Update on initial contact',
        task_type: 'Text'
      },
      is_automated: false
    },
    {
      title: 'Progress report',
      description:
        'Progress report during transaction',
      due_in: 13 * DAY + 8 * HOUR,
      email: 'fab735ba-8d12-11e9-bf9a-0a95998482ac',
      is_automated: true
    },
    {
      title: 'Report on conclusion of referral',
      description:
        'Report on conclusion of referral',
      due_in: 29 * DAY + 8 * HOUR,
      email: 'fb5810b6-8d12-11e9-bf9b-0a95998482ac',
      is_automated: true
    },
    {
      title: 'Send "Thank you" and "Payment"',
      description:
        'Send "Thank you" and "Payment"',
      due_in: 44 * DAY + 8 * HOUR,
      email: 'fbe86706-8d12-11e9-bf9c-0a95998482ac',
      is_automated: true
    }
  ]
}
