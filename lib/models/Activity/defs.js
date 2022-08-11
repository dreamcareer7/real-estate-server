module.exports = {
  'UserViewedAlert': {
    timeline: true,
  },
  'UserViewedListing': {
    timeline: true,
  },
  'UserSearchedListings': {
    timeline: true,
  },
  'UserLoggedIn': {
    timeline: false,
  },
  'UserLoggedOut': {
    timeline: false,
  },
  'UserFavoritedListing': {
    timeline: true,
    intercom: 'favorite-listing',
  },
  'UserSharedListing': {
    timeline: true,
    intercom: 'share-listing',
  },
  'UserCreatedAlert': {
    timeline: true
  },
  'UserSavedAlert': {
    timeline: false,
    intercom: 'save-search',
  },
  'UserSharedAlert': {
    timeline: false,
    intercom: 'share-search',
  },
  'UserCommentedRoom': {
    timeline: true,
  },
  'UserOpenedIOSApp': {
    timeline: true,
  },
  'UserCalledContact': {
    timeline: true,
  },
  'UserCreatedContact': {
    timeline: false,
    intercom: 'create-contact'
  },
  'UserSignedUp': {
    timeline: true,
    intercom: 'user-signup'
  },
  'UserInvited': {
    timeline: true,
  },
  'UserUploadedFile': {
    timeline: false,
  },
  'UserDeletedFile': {
    timeline: false,
  },
  'UserRenamedFile': {
    timeline: false
  },

  'UserUpdatedSubmission': {
    timeline: true,
  },
  'UserUpdatedReview': {
    timeline: true,
  },
  'UserViewedFile': {
    timeline: true,
  },
  'UserEmailedFile': {
    timeline: true,
  },
  'UserPrintedFile': {
    timeline: true,
  },
  'UserCreatedEnvelopeForTask': {
    timeline: true,
  },
  'UserVoidedEnvelopeForTask': {
    timeline: true,
  },
  'DealRoleReactedToEnvelopeForTask': {
    timeline: true,
  },
  'UserCreatedDeal': {
    intercom: 'create-deal'
  },
  'UserAddedTask': {
    timeline: false,
  },
  'UserRequiredTask': {
    timeline: false,
  },
  'UserNotifiedOffice': {
    timeline: false,
  },
  'UserRequestedDeletionOfTask': {
    timeline: false,
  },

  'UserCreatedCrmTask': {
    timeline: false,
    intercom: 'create-crm-task'
  },
  'UserCreatedContactAttributeDef': {
    timeline: false,
    intercom: 'create-contact-cusom-attribute'
  },
  'UserImportedContacts': {
    timeline: false,
    intercom: 'import-contacts'
  },
  'UserCreatedContactList': {
    timeline: false,
    intercom: 'create-contact-list'
  },
  'UserUpdatedContactList': {
    timeline: false,
    intercom: 'update-contact-list'
  }
}
