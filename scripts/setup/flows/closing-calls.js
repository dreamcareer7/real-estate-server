const HOUR = 3600
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

module.exports = {
  name: 'Post Closing Calls',
  description: 'Post Closing Calls',
  steps: [
    {
      title: 'Two-day follow-up',
      description: 'any surprises or unmet expectations in the house?',
      due_in: DAY + 8 * HOUR,
      event: {
        title: 'Two-day follow-up',
        description: 'any surprises or unmet expectations in the house?',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Two-week',
      description: 'are they starting to get unpacked/getting pictures up on the walls?',
      due_in: 2 * WEEK - DAY + 8 * HOUR,
      event: {
        title: 'Two-week follow-up',
        task_type: 'Call',
        description: 'are they starting to get unpacked/getting pictures up on the walls?'
      },
      is_automated: false
    },
    {
      title: 'One-month',
      description: 'have they met their neighbors yet?',
      due_in: MONTH - DAY + 8 * HOUR,
      event: {
        title: 'One-month follow-up',
        description: 'have they met their neighbors yet?',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Three-month',
      description: 'how is the home working out?',
      due_in: 3 * MONTH - DAY + 8 * HOUR,
      event: {
        title: 'Three-month follow-up',
        description: 'how is the home working out?',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Six-month',
      description: 'Annual call',
      due_in: 6 * MONTH - DAY + 8 * HOUR,
      event: {
        title: 'Six-month follow-up',
        description: 'Annual call',
        task_type: 'Call'
      },
      is_automated: false
    },
    {
      title: 'Anniversary of closing',
      description: 'Annual call',
      due_in: YEAR + 8 * HOUR,
      event: {
        title: 'Anniversary of closing',
        description: 'Annual call',
        task_type: 'Call'
      },
      is_automated: false
    },
  ]
}
