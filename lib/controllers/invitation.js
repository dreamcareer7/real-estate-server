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

function getUserInvitations(req, res) {
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
  var action = Boolean(req.body.accept);

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

function getShortlistInvitations(req, res) {
  var shortlist_id = req.params.id;

  Invitation.getForShortlist(shortlist_id, function(err, invitees) {
    if(err)
      return res.error(err);

    res.status(200);
    res.collection(invitees);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/invitations', b(recordInvitation));
  app.get('/users/:id/invitations', b(getUserInvitations));
  app.get('/shortlists/:id/invitations', b(getShortlistInvitations));
  app.patch('/users/:id/invitations/:iid', b(patchInvitation));
  app.delete('/users/:id/invitations/:iid', b(deleteInvitation));
}

module.exports = router;