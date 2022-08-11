const instagramProfiles = {
  insta1: {
    profile_picture_url: 'http://insta.com/insta.jpg',
    biography: 'hi1',
    id: 'insta1',
    username: 'instagram1',
    website: 'rechat.com',
  },
  insta2: {
    profile_picture_url: 'http://insta.com/insta2.jpg',
    biography: 'hi2',
    id: 'insta2',
    username: 'instagram2',
    website: 'rechat2.com',
  },
  insta3: {
    profile_picture_url: 'http://insta.com/insta3.jpg',
    biography: 'hi3',
    id: 'insta3',
    username: 'instagram3',
    website: 'rechat3.com', 
  },
  insta4: {
    profile_picture_url: 'http://insta.com/insta4.jpg',
    biography: 'hi4',
    id: 'insta4',
    username: 'instagram4',
    website: 'rechat4.com', 
  }
}

const facebookData = {
  validAccessToken: {
    access_token: 'validAccessToken',
    facebookProfile: {
      id: 'facebookProfile1',
      first_name: 'hossein',
      last_name: 'test',
      email: 'test@facebook.com',
      picture: {
        data: {
          height: 50,
          is_silhouette: false,
          url: 'http://insta.com/test.jpg',
          width: 50,
        },
      },
    },
    pages: {
      data: [
        {
          page: {
            access_token: 'page access token1',
            category: 'test',
            name: 'page1',
            id: 'page1Id',
          },
          instaId: instagramProfiles.insta1.id,
        },
        {
          page: {
            access_token: 'page access token2',
            category: 'test',
            name: 'page2',
            id: 'page2Id',
          },
          instaId: instagramProfiles.insta2.id, // I use this ID in social_post mock test
        },
        {
          page: {
            access_token: 'page access token3',
            category: 'test',
            name: 'page3',
            id: 'page3Id',
          },
          // this page doesn't have instagram 
        },
      ],
    },
  },
  validAccessToken2: {
    access_token: 'validAccessToken2',
    facebookProfile: {
      id: 'facebookProfile2',
      first_name: 'hossein',
      last_name: 'test',
      email: 'test@facebook.com',
      picture: {
        data: {
          height: 50,
          is_silhouette: false,
          url: 'http://insta.com/test.jpg',
          width: 50,
        },
      },
    },
    pages: {
      data: [       
        {
          page: {
            access_token: 'page access token new',
            category: 'test',
            name: 'page2',
            id: 'asdsfsdfasd',
          },
          instaId: instagramProfiles.insta3.id,
        },        
      ],
    },
  },
  upsertValidAccessToken1: {
    access_token: 'upsertValidAccessToken1',
    facebookProfile: {
      id: 'facebookProfile1',
      first_name: 'hossein',
      last_name: 'test',
      email: 'test@facebook.com',
      picture: {
        data: {
          height: 50,
          is_silhouette: false,
          url: 'http://insta.com/test.jpg',
          width: 50,
        },
      },
    },
    pages: {
      data: [
        {
          page: {
            access_token: 'page access token1',
            category: 'test',
            name: 'page1AfterUpdate',
            id: 'page1Id',
          },
          instaId: instagramProfiles.insta1.id,
        },        
        {
          page: {
            access_token: 'page access token3',
            category: 'test',
            name: 'page4',
            id: 'page4Id',
          },
          instaId: instagramProfiles.insta4.id,
        },
      ],
    },
  },
  emptyFacebookPage: {
    access_token: 'emptyFacebookPage',
    facebookProfile: {
      id: 'facebookProfile1emptyFacebookPage',
      first_name: 'hossein',
      last_name: 'test',
      email: 'testempty@facebook.com',
      picture: {
        data: {
          height: 50,
          is_silhouette: false,
          url: 'http://insta.com/test.jpg',
          width: 50,
        },
      },
    },
    pages: {
      data: [],
    },
  },
  emptyInstagram: {
    access_token: 'emptyInstagram',
    facebookProfile: {
      id: 'facebookProfile2emptyInstagram',
      first_name: 'hossein',
      last_name: 'test',
      email: 'testemptyInstagram@facebook.com',
      picture: {
        data: {
          height: 50,
          is_silhouette: false,
          url: 'http://insta.com/test.jpg',
          width: 50,
        },
      },
    },
    pages: {
      data: [       
        {
          page: {
            access_token: 'page access token new',
            category: 'test',
            name: 'page2',
            id: 'asdsfsdfasdemptyInstagram',
          },         
        },        
      ],
    },
  },
}

const codes = {
  validCode: facebookData.validAccessToken.access_token,
  validCode2: facebookData.validAccessToken2.access_token,
  validCodeForUpsert: facebookData.upsertValidAccessToken1.access_token,
  emptyFacebookPage: facebookData.emptyFacebookPage.access_token,
  emptyInstagram: facebookData.emptyInstagram.access_token
}

module.exports = {
  codes,
  facebookData,
  instagramProfiles,
  invalidCode: 'invalidCode'
}
