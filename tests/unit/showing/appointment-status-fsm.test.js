const sinon = require('sinon')
const proxyquire = require('proxyquire')
const { expect } = require('chai')

const { stub } = sinon

const Orm = { enableAssociation: stub()  }
const Appointment = { get: stub() }
const Approval = { getAll: stub() }
const Showing = { get: stub() }
const Role = { getAll: stub() }
const db = { update: stub() }

const notification = {
  sendAppointmentConfirmedNotificationToBuyer: stub(),
  clearNotifications: stub(),
  sendGetFeedbackTextMessageToBuyer: stub(),
  sendAppointmentRejectedNotificationToBuyer: stub(),
  sendAppointmentCanceledNotificationToOtherRoles: stub(),
  sendAppointmentConfirmedNotificationToOtherRoles: stub(),
  sendAppointmentRejectedNotificationToOtherRoles: stub(),
}

const mailerFactory = {
  forGetFeedbackEmail: stub(),
  forConfirmedAppointment: stub(),
  forRejectedAppointment: stub(),
  forCanceledAppointmentAfterConfir: stub(),
}

const {
  utils,
  handlers,
  dispatchEvent
} = proxyquire('../../../lib/models/Showing/appointment/status_fsm', {
  '../../../utils/db': db,
  '../approval/get': Approval,
  '../appointment/get': Appointment,
  '../showing/get': Showing,
  '../role/get': Role,
  '../../Orm/context': Orm,
  './notification': notification,
  './mailer-factory': mailerFactory,
})

sinon.stub(utils)
sinon.stub(handlers)

const make = {
  approval: (id = 'appr', approved = false) => ({ id, approved }),
  appointment: (id = 'appt', status = 'OldStatus') => ({ id, status }),

  showing: (
    id = 'show',
    approval_type = 'All',
    roles = ['r1', 'r2']
  ) => ({ id, approval_type, roles }),
  
  payload: (
    action = 'FakeAction',
    showing = make.showing(),
    appointment = make.appointment(),
    approvals = [make.approval('appr1'), make.approval('appr2')]    
  ) => ({ action, showing, appointment, approvals }),

  approvalPayload: (...props) => make.payload('ApprovalPerformed', ...props)
}

describe('Showing/Appointment/status-fsm', () => {
  afterEach(() => sinon.reset())
  
  context('utils.everyoneApproved()', () => {
    context('returns false when...', () => {
      it('approvals are empty', () => {
        utils.everyoneApproved.callThrough()

        expect(utils.everyoneApproved([], [{}, {}])).to.be.false
      })

      it('roles are empty', () => {
        utils.everyoneApproved.callThrough()

        expect(utils.everyoneApproved([{}, {}], [])).to.be.false
      })

      it('there\'s no intersection between roles and approvals', () => {
        const roles = ['r1', 'r2']
        const approvals = [
          { approved: true, role: 'r3' },
          { approved: true, role: 'r4' },
        ]
        
        utils.everyoneApproved.callThrough()

        expect(utils.everyoneApproved(approvals, roles)).to.be.false
      })

      it('some roles reject', () => {
        const roles = ['r1', 'r2']
        const approvals = [
          { approved: true, role: 'r1' },
          { approved: false, role: 'r2' },
          { approved: true, role: 'r3' },
          { approved: true, role: 'r4' },
        ]
        
        utils.everyoneApproved.callThrough()

        expect(utils.everyoneApproved(approvals, roles)).to.be.false        
      })
      
      it('some roles have no approval', () => {
        const roles = ['r1', 'r2']
        const approvals = [
          { approved: true, role: 'r1' },
          { approved: true, role: 'r3' },
          { approved: true, role: 'r4' },
        ]
        
        utils.everyoneApproved.callThrough()

        expect(utils.everyoneApproved(approvals, roles)).to.be.false                
      })
    })
    
    it('returns true when all roles confirmed', () => {
      const roles = ['r1', 'r2']
      const approvals = [
        { approved: true, role: 'r1' },
        { approved: true, role: 'r3' },
        { approved: false, role: 'r4' },
        { approved: true, role: 'r2' },
      ]
      
      utils.everyoneApproved.callThrough()

      expect(utils.everyoneApproved(approvals, roles)).to.be.true
    })
  })

  context('utils.findLatestApproval()', () => {
    function testFindLatest (approved) {
      const EXPECTED = { created_at: 10, updated_at: 10, approved }
      
      const approvals = [
        { created_at: 9, updated_at: 11, approved },
        EXPECTED,
        { created_at: 11, updated_at: 11, approved: !approved },
      ]

      utils.findLatestApproval.callThrough()

      expect(utils.findLatestApproval(approvals, approved)).to.be.equal(EXPECTED)
    }
    
    it('can find latest approved approval', () => {
      testFindLatest(true)
    })
    
    it('can find latest rejected approval', () => {
      testFindLatest(false)
    })
    
    it('returns nil when nothing found', () => {
      const allApproved = [
        { created_at: 1, updated_at: 1, approved: true },
        { created_at: 1, updated_at: 1, approved: true },
      ]

      const allRejected = [
        { created_at: 1, updated_at: 1, approved: false },
        { created_at: 1, updated_at: 1, approved: false },        
      ]
      
      utils.findLatestApproval.callThrough()

      expect(utils.findLatestApproval([], true)).to.be.undefined
      expect(utils.findLatestApproval([], true)).to.be.undefined
      expect(utils.findLatestApproval(allApproved, false)).to.be.undefined
      expect(utils.findLatestApproval(allRejected, true)).to.be.undefined
    })
  })

  context('utils.send()', () => {
    it('does nothing when mailer is nil', async () => {
      utils.send.callThrough()

      await utils.send(null)
      await utils.send(undefined)
      await utils.send(Promise.resolve(null))
      await utils.send(Promise.resolve(undefined))
    })
    
    it('calls send method after resolving non-nil mailer', async () => {
      const mailer = { send: sinon.fake() }

      utils.send.callThrough()
      await utils.send(Promise.resolve(mailer))

      expect(mailer.send.calledOnce)
    })
  })

  context('utils.patchStatus()', () => {
    // noop
  })

  context('utils.predicate()', () => {
    context('returns a function that...', () => {
      it('returns true when its args include actual value', () => {
        utils.predicate.callThrough()

        const pred = utils.predicate('foo')        

        expect(pred('baz', 'foo', 'bar')).to.be.true
      })
      
      it('returns false when iss args does not include actual value', () => {
        utils.predicate.callThrough()
        
        const pred = utils.predicate('1')

        expect(pred('1 ', 1, 1n)).to.be.false
      })
    })
  })

  context('handlers.finalized()', () => {
    it('populate all showing roles', async () => {
      const payload = make.payload()
      
      handlers.finalized.callThrough()
      Role.getAll.withArgs(payload.showing.roles).resolves([])
      
      await handlers.finalized(payload)

      expect(Role.getAll.calledOnceWithExactly(payload.showing.roles))
    })
    
    it('clears notifications of populated showing roles', async () => {
      const userIds = ['user1', 'user2']
      const roles = [
        { id: 'r1', user_id: userIds[0] },
        { id: 'r2', user_id: userIds[1] },
      ]
      
      const payload = make.payload()
      
      handlers.finalized.callThrough()
      Role.getAll.withArgs(payload.showing.roles).resolves(roles)
      
      await handlers.finalized(payload)

      expect(notification.clearNotifications.callCount).to.be.equal(roles.length)
      expect(notification.clearNotifications.alwaysCalledWithMatch(
        sinon.match.in(userIds),
        payload.appointment.id
      ))
    })
  })

  context('handlers.completed()', () => {
    it('sends get-feedback sms & email to buyer', async () => {
      const payload = make.payload()
      
      handlers.completed.callThrough()

      await handlers.completed(payload)

      expect(notification.sendGetFeedbackTextMessageToBuyer
        .calledOnceWithExactly(payload.appointment.id))
      expect(mailerFactory.forGetFeedbackEmail
        .calledOnceWithExactly(payload.appointment))
    })
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
    it('maps simple actions to their related appointment status', () => {
      const payload = make.payload()
      
      utils.guessNewStatus.callThrough()
      
      payload.action = 'BuyerCanceled'
      expect(utils.guessNewStatus(payload)).to.be.equal('Canceled')

      payload.action = 'BuyerRescheduled'
      expect(utils.guessNewStatus(payload)).to.be.equal('Rescheduled')      
    })
    
    it('returns Completed/Canceled for Finished based on old status', () => {
      const payload = make.payload('Finished')
      
      utils.guessNewStatus.callThrough()

      payload.appointment.status = 'Confirmed'
      expect(utils.guessNewStatus(payload)).to.be.equal('Completed')

      payload.appointment.status = 'NotConfirmed'
      expect(utils.guessNewStatus(payload)).to.be.equal('Canceled')
    })

    context('when an approval is performed returns...', () => {
      it('Canceled if someone rejected', () => {
        const payload = make.approvalPayload()

        utils.guessNewStatus.callThrough()

        expect(utils.guessNewStatus(payload)).to.be.equal('Canceled')
      })
      
      it('Confirmed if approval type is None', () => {
        const payload = make.approvalPayload()
        payload.approvals.forEach(a => { a.approved = true })
        payload.showing.approval_type = 'None'

        utils.guessNewStatus.callThrough()

        expect(utils.guessNewStatus(payload)).to.be.equal('Confirmed')
      })
      
      it('Requested when approvals is empty', () => {
        const payload = make.approvalPayload()
        payload.approvals.forEach(a => { a.approved = true })
        payload.approvals = []

        utils.guessNewStatus.callThrough()

        expect(utils.guessNewStatus(payload)).to.be.equal('Requested')
      })
      
      it('Confirmed if someone confirmed and approval type is Any', () => {
        const payload = make.approvalPayload()
        payload.showing.approval_type = 'Any'
        payload.approvals = [make.approval('confirmed-approval', true)]

        utils.guessNewStatus.callThrough()

        expect(utils.guessNewStatus(payload)).to.be.equal('Confirmed')
      })
      
      it('Confirmed if all roles confirmed and approval type is All', () => {
        const payload = make.approvalPayload()
        payload.showing.roles = ['r1', 'r2']
        payload.approvals.forEach(a => { a.approved = true })

        utils.everyoneApproved
          .withArgs(payload.approvals, payload.showing.roles)
          .returns(true)
        utils.guessNewStatus.callThrough()

        expect(utils.everyoneApproved.calledOnce)
        expect(utils.guessNewStatus(payload)).to.be.equal('Confirmed')
      })
      
      it('old status if action is not handled', () => {
        const payload = make.payload('MissingAction')

        utils.guessNewStatus.callThrough()

        expect(utils.guessNewStatus(payload)).to.be.equal(payload.appointment.status)
      })
    })
  })

  context('handlers.handleAction()', () => {
    it('does nothing if status is not changed', async () => {
      const payload = make.payload()
      
      utils.guessNewStatus.withArgs(payload).returns(payload.action)

      await handlers.handleAction(payload)

      expect(utils.guessNewStatus.calledOnceWithExactly(payload))
      expect(utils.patchStatus.notCalled)
      expect(utils.validateTransition.notCalled)
    })
    
    it('calls handlers.completed if new status is Completed', async () => {
      const payload = make.payload()

      utils.guessNewStatus.withArgs(payload).returns('Completed')
      utils.predicate.callThrough()

      await handlers.handleAction(payload)

      expect(utils.validateTransition.calledOnce)
      expect(utils.patchStatus.calledOnce)
      expect(handlers.completed.calledOnceWithExactly(payload))
    })
    
    it('calls handlers.finalized if new status is Completed or Canceled', async () => {
      const payload = make.payload()
      utils.predicate.callThrough()
      
      for (const finalStatus of ['Completed', 'Canceled']) {
        utils.guessNewStatus.withArgs(payload).returns(finalStatus)

        await handlers.handleAction(payload)

        expect(utils.validateTransition.calledOnce)
        expect(utils.patchStatus.calledOnce)
        expect(handlers.finalized.calledOnceWithExactly(payload))      
        
        sinon.reset()
      }
    })
    
    it('calls utils.patchStatus w/ appointment ID and newStatus', async () => {
      const payload = make.payload()
      const appt = payload.appointment
      const newStatus = 'NewStatus'

      utils.guessNewStatus.withArgs(payload).returns(newStatus)

      await handlers.handleAction(payload)

      expect(utils.validateTransition.calledOnceWithExactly(
        appt.status, newStatus
      ))

      expect(utils.patchStatus.calledOnceWithExactly(appt.id, newStatus))
    })

    context('when an approval is performed...', () => {
      async function testApproval (oldStatus, newStatus, handler) {
        const payload = make.approvalPayload()
        payload.appointment.status = oldStatus

        utils.predicate.callThrough()
        utils.guessNewStatus.withArgs(payload).returns(newStatus)

        await handlers.handleAction(payload)

        expect(handlers[handler].calledOnceWithExactly(payload))

        sinon.reset()
      }
      
      it('calls handlers.confirmed if new status is Confirmed', async () => {
        await testApproval('AnyStatus', 'Confirmed', 'confirmed')
      })
      
      it('calls handlers.rejected if it was a rejection', async () => {
        await testApproval('Requested', 'Canceled', 'rejected')
        await testApproval('Rescheduled', 'Canceled', 'rejected')
      })
      
      it('calls handlers.canceledAfterConfirm if it was a cancelation', async () => {
        await testApproval('Confirmed', 'Canceled', 'canceledAfterConfirm')
      })
    })
  })

  context('.dispatchEvent()', () => {
    it('calls handlers.handleAction w/ populated payload', async () => {
      const action = 'InvalidAction'
      const apptId = 'foo'
      const appointment = { showing: 'bar', approvals: ['baz', 'qux'] }
      const showing = { id: 'quux' }
      const approvals = [{ id: 'nux' }]

      Appointment.get.withArgs(apptId).resolves(appointment)
      Showing.get.withArgs(appointment.showing).resolves(showing)
      Approval.getAll.withArgs(appointment.approvals).resolves(approvals)
      
      await dispatchEvent(action, apptId)

      expect(handlers.handleAction.calledOnce)

      const payload = handlers.handleAction.firstCall.firstArg

      expect(payload).to.be.an('object')
        .that.includes({ action, appointment, showing, approvals })
    })
  })
})
