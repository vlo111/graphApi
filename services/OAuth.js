import qs from 'qs';
import axi from 'axios';
import oauth from 'oauth';
import { google } from 'googleapis';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  //------------------
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  //------------------
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  //------------------
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
} = process.env;

class OAuth {
  static v1 = {
    Twitter: {
      getToken: async (callback) => {
        try {
          const oa = new oauth.OAuth(
            'https://twitter.com/oauth/request_token',
            'https://twitter.com/oauth/access_token',
            TWITTER_CONSUMER_KEY,
            TWITTER_CONSUMER_SECRET,
            '1.0A',
            callback,
            'HMAC-SHA1',
          );

          const promise = new Promise((resolve, reject) => {
            oa.getOAuthRequestToken((error, oAuthToken, oAuthTokenSecret, results) => {
              if (error) reject(error);
              resolve({
                oAuthToken,
                oAuthTokenSecret,
                results
              });
            });
          });

          return await promise;
        } catch (e) {
          console.log(e);
          return e;
        }
      },

      getProfile: async (oauthToken, oauthVerifier, callback) => {
        try {
          const oa = new oauth.OAuth(
            'https://twitter.com/oauth/request_token',
            'https://twitter.com/oauth/access_token',
            TWITTER_CONSUMER_KEY,
            TWITTER_CONSUMER_SECRET,
            '1.0A',
            callback,
            'HMAC-SHA1',
          );

          const { data } = await axi.post(
            `https://api.twitter.com/oauth/access_token?oauth_token=${oauthToken}&oauth_verifier=${oauthVerifier}`,
          );

          const parsedData = qs.parse(data);

          const promise = new Promise((resolve, reject) => {
            oa.get('https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
              parsedData.oauth_token,
              parsedData.oauth_token_secret,
              (error, twitterResponseData) => {
                if (error) reject(error);
                resolve({ ...parsedData, ...JSON.parse(twitterResponseData) });
              });
          });

          return await promise;
        } catch (e) {
          return null;
        }
      },
    },
  };

  static v2 = {
    Google: {
      async getProfile(accessToken) {
        const [
          { data: userInfo },
          { data: userProfile },
        ] = await Promise.all([
          axi.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`),
          axi.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`),
        ]);

        return {
          ...userInfo,
          ...userProfile,
        };
      },
    },

    Facebook: {
      async getProfile(accessToken) {
        const { data } = await axi({
          url: 'https://graph.facebook.com/me',
          method: 'get',
          params: {
            fields: ['id', 'email', 'first_name', 'last_name'].join(','),
            access_token: accessToken,
          },
        });

        console.log({
          ...data,
          accessToken,
        });

        return data;
      },
    },

    Linkedin: {
      async getProfile(code, redirectUri) {
        const { data: access } = await axi({
          method: 'post',
          url: 'https://api.linkedin.com/oauth/v2/accessToken',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          data: qs.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: encodeURI(redirectUri),
            client_id: LINKEDIN_CLIENT_ID,
            client_secret: LINKEDIN_CLIENT_SECRET,
          }),
        });

        const { data } = await axi({
          method: 'get',
          url: 'https://api.linkedin.com/v2/me',
          headers: {
            Authorization: `Bearer ${access.access_token}`,
          },
        });

        try {
          const { data: emailRes } = await axi({
            method: 'get',
            url: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
            headers: {
              Authorization: `Bearer ${access.access_token}`,
            },
          });

          const { elements: [{ 'handle~': { emailAddress } }] } = emailRes;

          data.email = emailAddress;
        } catch (e) {
          console.log(e);
          data.email = null;
        }

        return data;
      },
    },
  };
}

export default OAuth;
