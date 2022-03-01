module.exports = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      required: true,
      enum: [
        'UserLoggedIn',
        'UserLoggedOut',
        'UserViewedAlert',
        'UserViewedListing',
        'UserSearchedListings',
        'UserFavoritedListing',
        'UserSharedListing',
        'UserCreatedAlert',
        'UserCommentedRoom',
        'UserOpenedIOSApp',
        'UserSignedUp',
        'UserInvited',
        'UserUploadedFile',
        'UserDeletedFile',

        'UserUpdatedSubmission',
        'UserUpdatedReview',
        'UserViewedFile',
        'UserEmailedFile',
        'UserPrintedFile',
        'UserRenamedFile',
        'UserCreatedEnvelopeForTask',
        'UserVoidedEnvelopeForTask',
        'UserRequiredTask',
        'DealRoleReactedToEnvelopeForTask',

        'UserRequestedDeletionOfTask',
        'UserAddedTask',
        'UserNotifiedOffice',
        'UserCreatedDeal', // Not in timeline
        'UserSavedAlert', // Not in timeline
        'UserSharedAlert', // Not in timeline

        // CRM
        'UserCalledContact',
        'UserCreatedContact',
        'UserCreatedCrmTask',
        'UserCreatedContactAttributeDef',
        'UserImportedContacts',
        'UserCreatedContactList',
        'UserUpdatedContactList',

        'UserScheduledEmail'
      ]
    }
  }
}
