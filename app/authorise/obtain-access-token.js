const request = require('superagent');
const { setupMutualTLS } = require('../certs-util');
const { getClientCredentials, tokenEndpoint } = require('../authorisation-servers');
const log = require('debug')('log');
const debug = require('debug')('debug');
const error = require('debug')('error');

// Use Basic Authentication Scheme: https://tools.ietf.org/html/rfc2617#section-2
const credentials = (userid, password) => {
  const basicCredentials = Buffer.from(`${userid}:${password}`).toString('base64');
  return `Basic ${basicCredentials}`;
};

/*
 * For now only support Client Credentials Grant Type (OAuth 2.0):
 * https://tools.ietf.org/html/rfc6749#section-4.4
 *
 * Assume authentication using a client_id and client_secret:
 * https://tools.ietf.org/html/rfc6749#section-2.3
 */
const postToken = async (authorisationServerId, clientId, clientSecret, payload) => {
  try {
    const tokenUri = await tokenEndpoint(authorisationServerId);
    const authCredentials = credentials(clientId, clientSecret);
    log(`POST to ${tokenUri}`);
    const response = await setupMutualTLS(request.post(tokenUri))
      .set('authorization', authCredentials)
      .set('content-type', 'application/x-www-form-urlencoded')
      .send(payload);
    const data = response.body;
    debug(`token response: ${JSON.stringify(data)}`);
    return data;
  } catch (err) {
    error(err);
    const e = new Error(err.message);
    e.status = err.response ? err.response.status : 500;
    throw e;
  }
};

// Returns access-token when request successful
const createAccessToken = async (authorisationServerId) => {
  const { clientId, clientSecret } = await getClientCredentials(authorisationServerId);
  const accessTokenPayload = {
    scope: 'accounts payments', // include both scopes for client credentials grant
    grant_type: 'client_credentials',
  };

  const response = await postToken(
    authorisationServerId,
    clientId,
    clientSecret,
    accessTokenPayload,
  );
  return response.access_token;
};

exports.postToken = postToken;
exports.createAccessToken = createAccessToken;
