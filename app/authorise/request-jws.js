const jws = require('jws');
const jose = require('node-jose');

const signingKey = () => Buffer.from(process.env.SIGNING_KEY || '', 'base64').toString();

/**
 * Issuer of the token.
 * OpenID Connect protocol mandates this MUST include the client ID of the TPP.
 * Should contain the ClientID of the TPP’s OAuth Client.
 * Required as per FAPI RW / OpenID Standard.
 * For now return raw clientId
 */
const issuer = clientId => clientId;

/**
 * Used to help mitigate against replay attacks.
 * Required by FAPI Read Write (Hybrid explicitly required –
 * required by OIDC Core for Hybrid Flow).
 * Hybrid Flow support is optional in the OB Security Profile.
 * For now return dummy value.
 */
const nonce = () => 'dummy-nonce';

const claims = requestId => ({
  userinfo: {
    openbanking_intent_id: {
      value: requestId, // not sure this
      essential: true,
    },
  },
  id_token: {
    openbanking_intent_id: {
      value: requestId,
      essential: true,
    },
    acr: {
      essential: true,
    },
  },
});

const createClaims = (
  scope, requestId, clientId, authServerIssuer,
  registeredRedirectUrl, state, useOpenidConnect, // eslint-disable-line
) => ({
  aud: authServerIssuer,
  iss: issuer(clientId),
  response_type: 'code',
  client_id: clientId,
  redirect_uri: registeredRedirectUrl,
  scope,
  state,
  nonce: nonce(),
  max_age: 86400,
  claims: claims(requestId),
});

const signWithNone = payload => jws.sign({
  header: { alg: 'none' },
  payload,
});

const signWithFapiAlg = async (alg, payload, key) => {
  const keyObject = await jose.JWK.asKey(key, 'pem');
  const result = await jose.JWS.createSign({ alg }, keyObject)
    .update(JSON.toString(payload))
    .final();
  return result.signatures[0].signature;
};

const signWithOtherAlg = (alg, payload, key) => jws.sign({
  header: { alg },
  payload,
  privateKey: key,
});

/**
 * FAPI says JWS signatures shall use the PS256 or ES256 algorithms for signing.
 * See: https://openid.net/specs/openid-financial-api-part-2.html#rfc.section.8.6
 *
 * As the Open Banking certificates are RSA certificates, only PS256 will be supported.
 * Open Banking is also permitting RS256 in MIT for now to ease implementation.
 * Some reference banks are also permitting HS256 for now to ease implementation.
 */
const createJsonWebSignature = async (payload, signingAlgs, clientSecret) => {
  if (signingAlgs === ['none']) {
    return signWithNone(payload);
  }
  const key = signingKey();
  if (key.length > 0) {
    if (signingAlgs.includes('PS256')) {
      return signWithFapiAlg('PS256', payload, key);
    }
    if (signingAlgs.includes('RS256')) {
      return signWithOtherAlg('RS256', payload, key);
    }
  }
  if (signingAlgs.includes('HS256')) {
    return signWithOtherAlg('HS256', payload, clientSecret);
  }
  if (signingAlgs.includes('none')) {
    return signWithNone(payload);
  }
  throw new Error(`${signingAlgs} not supported`);
};

exports.createClaims = createClaims;
exports.createJsonWebSignature = createJsonWebSignature;
