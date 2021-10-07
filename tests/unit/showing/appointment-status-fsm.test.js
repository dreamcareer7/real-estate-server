
describe('Showing/Appointment/status-fsm', () => {
  context('utils.everyoneApproved()', () => {
    it('throws when roles are empty')
    
    it('returns true when all roles confirmed')

    context('returns false when...', () => {
      it('some roles reject')
      it('some roles have no approval')
    })    
  })

  context('utils.findLatestApproval()', () => {
    it('can find latest approved approval')
    it('can find latest rejected approval')
    it('returns nil when nothing found')
  })

  context('utils.send()', () => {
    it('does nothing when mailer is nil')
    it('calls send method after resolving non-nil mailer')
  })

  context('utils.patchStatus()', () => {
    // noop
  })

  context('utils.predicate()', () => {
    context('returns a function that...', () => {
      it('returns true when its args include actual value')
      it('returns false when iss args does not include actual value')
    })
  })

  context('handlers.finalized()', () => {
    it('populate all showing roles')
    it('clears notifications of populated showing roles')
  })

  context('handlers.completed()', () => {
    it('sends get-feedback sms & email to buyer')
  })

  context('handlers.confirmed()', () => {
    it('sends appointment-confirmed sms & email to buyer')
    it('sends confirmation notif to other roles')
  })

  context('handlers.rejected()', () => {
    it('sends appointment-rejected sms & email to buyer')
    it('sends rejection notif to other roles')
  })

  context('handlers.canceledAfterConfirm()', () => {
    it('sends appointment-canceled sms & email to buyer')
    it('sends cancelation notif to other roles')
  })

  context('utils.guessNewStatus()', () => {
    it('maps simple actions to their related appointment status')
    it('returns Completed/Canceled for Finished based on old status')

    context('when an approval is performed returns...', () => {
      it('Canceled if someone rejected')
      it('Confirmed if approval type is None')
      it('Requested when approvals is empty')
      it('Confirmed if someone confirmed and approval type is Any')
      it('Confirmed if all roles confirmed and approval type is All')
      it('old status if action is not handled')
    })
  })

  context('handlers.handleAction()', () => {
    it('does nothing if status is not changed')
    it('calls handlers.completed if new status is Completed')
    it('calls handlers.finalized if new status is Completed or Canceled')
    it('calls utils.patchStatus w/ appointment ID and newStatus')

    context('when an approval is performed...', () => {
      it('calls handlers.confirmed if new status is confirmed')
      it('calls handlers.rejected if it was a rejection')
      it('calls handlers.canceledAfterConfirm if it was a cancelation')
    })
  })

  context('.dispatchEvent()', () => {
    it('calls handlers.handleAction w/ populated payload')
  })
})
