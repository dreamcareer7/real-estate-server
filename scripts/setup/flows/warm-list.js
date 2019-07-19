const HOUR = 3600
const DAY = 24 * HOUR

module.exports = {
  name: 'Warm List',
  description: 'Warm List',
  steps: [
    {
      title: 'Email',
      description:
        'Email',
      due_in: 29 * DAY + 8 * HOUR,
      email: 'fab735ba-8d12-11e9-bf9a-0a95998482ac',
      is_automated: true
    },
    {
      title: 'Party Invite',
      description: 'Party Invite',
      due_in: 59 * DAY + 8 * HOUR,
      event: {
        title: 'Party Invite',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Postcard',
      description:
        'Postcard',
      due_in: 89 * DAY + 8 * HOUR,
      event: {
        title: 'Postcard',
        task_type: 'Mail'
      },
      is_automated: false
    },
    {
      title: 'Email',
      description:
        'Email',
      due_in: 119 * DAY + 8 * HOUR,
      email: 'fab735ba-8d12-11e9-bf9a-0a95998482ac',
      is_automated: true
    },
    {
      title: 'Party Invite',
      description: 'Party Invite',
      due_in: 149 * DAY + 8 * HOUR,
      event: {
        title: 'Party Invite',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Postcard',
      description:
        'Postcard',
      due_in: 179 * DAY + 8 * HOUR,
      event: {
        title: 'Postcard',
        task_type: 'Mail'
      },
      is_automated: false
    },
    {
      title: 'Email',
      description:
        'Email',
      due_in: 209 * DAY + 8 * HOUR,
      email: 'fab735ba-8d12-11e9-bf9a-0a95998482ac',
      is_automated: true
    },
    {
      title: 'Party Invite',
      description: 'Party Invite',
      due_in: 239 * DAY + 8 * HOUR,
      event: {
        title: 'Party Invite',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Postcard',
      description:
        'Postcard',
      due_in: 269 * DAY + 8 * HOUR,
      event: {
        title: 'Postcard',
        task_type: 'Mail'
      },
      is_automated: false
    }
  ]
}
