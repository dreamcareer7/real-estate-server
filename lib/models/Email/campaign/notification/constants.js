module.exports = {
  open_debounce_key: 'emails_open_event_debouncer',
  open_process_delay: 60,

  email_events: {
    delivered: 'delivered',
    unsubscribed: 'unsubscribed',
    clicked: 'clicked',
    failed: 'failed',
    opened: 'opened'
  },

  reactedToEvents: ['clicked', 'opened']
}