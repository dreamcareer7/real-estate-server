const HOUR = 3600
const DAY = 24 * HOUR

module.exports = {
  name: 'New Inbound Lead',
  description: 'New Inbound Lead',
  steps: [
    {
      title: 'Call',
      description: 'Call',
      due_in: 8 * HOUR,
      event: {
        title: 'Call: Appointment missed!',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Email',
      description: 'Email',
      due_in: 9 * HOUR,
      email: 'fab735ba-8d12-11e9-bf9a-0a95998482ac',
      is_automated: true
    },
    {
      title: 'Call',
      description: 'Call',
      due_in: DAY + 8 * HOUR,
      event: {
        title: 'Call: Appointment missed!',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Email',
      description: 'Email',
      due_in: DAY + 9 * HOUR,
      email: 'fab735ba-8d12-11e9-bf9a-0a95998482ac',
      is_automated: true
    },
    {
      title: 'Text',
      description: 'Text',
      due_in: 2 * DAY + 8 * HOUR,
      event: {
        title: 'Text: New Inbound Lead',
        task_type: 'Text'
      },
      is_automated: false
    },
    {
      title: 'Email',
      description: 'Email',
      due_in: 4 * DAY + 8 * HOUR,
      email: 'fab735ba-8d12-11e9-bf9a-0a95998482ac',
      is_automated: true
    },
    {
      title: 'Call',
      description: 'Call',
      due_in: 6 * DAY + 8 * HOUR,
      event: {
        title: 'Call: Appointment missed!',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Call',
      description: 'Call',
      due_in: 8 * DAY + 8 * HOUR,
      event: {
        title: 'Call: Appointment missed!',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Email',
      description: 'Email',
      due_in: 8 * DAY + 9 * HOUR,
      email: 'fab735ba-8d12-11e9-bf9a-0a95998482ac',
      is_automated: true
    }
  ]
}
