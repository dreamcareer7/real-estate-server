function recordInvitation(req, res) {
  var invitation = req.body;
  invitation.resource = req.params.sid;

  Invitation.create(invitation, function(err, invitation) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(200);
    res.model(invitation);
  });
}

function getInvitations(req, res) {
  var user = req.params.id;

  Invitation.getForUser(user, function(err, invitations) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(invitations);
  });
}

function patchInvitation(req, res) {
  var user = req.params.id;
  var invitation = req.params.iid;
  var action = (req.body.accept === 'true')

  Invitation.patch(invitation, action, function(err, invitation) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.model(invitation);
  });
}

function deleteInvitation(req, res) {
  var user = req.params.id;
  var invitation = req.params.iid;

  Invitation.delete(invitation, function(err, ok) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(200);
    res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/invitations', recordInvitation);
  app.get('/users/:id/invitations', getInvitations);
  app.patch('/users/:id/invitations/:iid', patchInvitation);
  app.delete('/users/:id/invitations/:iid', deleteInvitation);
}

module.exports = router;