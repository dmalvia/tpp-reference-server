const { createClaims, createJsonWebSignature } = require('./request-jws');
const {
  authorisationEndpoint, getClientCredentials, issuer, requestObjectSigningAlgs,
} = require('../authorisation-servers');

const env = require('env-var');
const qs = require('qs');

const registeredRedirectUrl = env.get('SOFTWARE_STATEMENT_REDIRECT_URL').asString();

const statePayload = (authorisationServerId, sessionId, scope, interactionId, accountRequestId) => {
  const state = {
    authorisationServerId,
    interactionId,
    sessionId,
    scope,
    accountRequestId,
  };
  return Buffer.from(JSON.stringify(state)).toString('base64');
};

const generateRedirectUri = async (authorisationServerId, requestId, scope,
  sessionId, interactionId) => {
  const { clientId, clientSecret } = await getClientCredentials(authorisationServerId);
  const state = statePayload(authorisationServerId, sessionId, scope, interactionId, requestId);
  const authEndpoint = await authorisationEndpoint(authorisationServerId);
  const authServerIssuer = await issuer(authorisationServerId);
  const signingAlgs = await requestObjectSigningAlgs(authorisationServerId);
  const payload = createClaims(
    scope, requestId, clientId, authServerIssuer,
    registeredRedirectUrl, state, createClaims,
  );
  const signature = await createJsonWebSignature(payload, signingAlgs, clientSecret);
  const uri =
    `${authEndpoint}?${qs.stringify({
      redirect_uri: registeredRedirectUrl,
      state,
      client_id: clientId,
      response_type: 'code',
      request: signature,
      scope,
    })}`;
  return uri;
};

exports.generateRedirectUri = generateRedirectUri;
exports.statePayload = statePayload;
