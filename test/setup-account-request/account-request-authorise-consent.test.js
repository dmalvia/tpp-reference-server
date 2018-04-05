const request = require('supertest');
const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const express = require('express');
const bodyParser = require('body-parser');
const env = require('env-var');
const qs = require('qs');

const { statePayload } = require('../../app/authorise/authorise-uri.js');

const authorisationServerId = '123';
const accountRequestId = 'account-request-id';
const clientId = 'testClientId';
const clientSecret = 'testClientSecret';
const redirectUrl = 'http://example.com/redirect';
const issuer = 'http://example.com';
const jsonWebSignature = 'testSignedPayload';
const key = 'testKey';
const interactionId = key;
const fapiFinancialId = 'testFapiFinancialId';

const setupApp = (setupAccountRequestStub, authorisationEndpointStub) => {
  const clientCredentialsStub = sinon.stub().returns({ clientId, clientSecret });
  const createJsonWebSignatureStub = sinon.stub().returns(jsonWebSignature);
  const issuerStub = sinon.stub().returns(issuer);
  const keyStub = sinon.stub().returns(key);
  const requestObjectSigningAlgsStub = sinon.stub().returns(['none']);
  const { generateRedirectUri } = proxyquire(
    '../../app/authorise/authorise-uri.js',
    {
      'env-var': env.mock({
        SOFTWARE_STATEMENT_REDIRECT_URL: redirectUrl,
      }),
      './request-jws': {
        createJsonWebSignature: createJsonWebSignatureStub,
      },
      '../authorisation-servers': {
        authorisationEndpoint: authorisationEndpointStub,
        getClientCredentials: clientCredentialsStub,
        issuer: issuerStub,
        requestObjectSigningAlgs: requestObjectSigningAlgsStub,
      },
    },
  );
  const { accountRequestAuthoriseConsent } = proxyquire(
    '../../app/setup-account-request/account-request-authorise-consent.js',
    {
      './setup-account-request': {
        setupAccountRequest: setupAccountRequestStub,
      },
      '../authorise': {
        generateRedirectUri,
      },
      '../authorisation-servers': {
        fapiFinancialIdFor: () => fapiFinancialId,
      },
      'uuid/v4': keyStub,
    },
  );
  const app = express();
  app.use(bodyParser.json());
  app.post('/account-request-authorise-consent', accountRequestAuthoriseConsent);
  return app;
};

const sessionId = 'testSession';

const doPost = app => request(app)
  .post('/account-request-authorise-consent')
  .set('authorization', sessionId)
  .set('x-authorization-server-id', authorisationServerId)
  .send();

const parseState = state => JSON.parse(Buffer.from(state, 'base64').toString('utf8'));

describe('/account-request-authorise-consent with successful setupAccountRequest', () => {
  const setupAccountRequestStub = sinon.stub().returns(accountRequestId);
  const authorisationEndpointStub = sinon.stub().returns('http://example.com/authorize');
  const app = setupApp(setupAccountRequestStub, authorisationEndpointStub);

  const scope = 'openid accounts';
  const expectedStateBase64 = statePayload(
    authorisationServerId,
    sessionId,
    scope,
    interactionId,
    accountRequestId,
  );
  const expectedRedirectHost = 'http://example.com/authorize';
  const expectedParams = {
    client_id: clientId,
    redirect_uri: redirectUrl,
    request: jsonWebSignature,
    response_type: 'code',
    scope,
    state: expectedStateBase64,
  };
  const expectedState = {
    authorisationServerId,
    interactionId,
    scope,
    sessionId,
    accountRequestId,
  };

  it('creates a redirect URI with a 200 code via the to /authorize endpoint', (done) => {
    doPost(app)
      .end((e, r) => {
        assert.equal(r.status, 200);
        const location = r.body.uri;
        const parts = location.split('?');
        const host = parts[0];
        const params = qs.parse(parts[1]);
        assert.equal(host, expectedRedirectHost);

        const state = parseState(params.state);
        assert.deepEqual(state, expectedState);

        assert.deepEqual(params, expectedParams);
        const header = r.headers['access-control-allow-origin'];
        assert.equal(header, '*');
        assert(setupAccountRequestStub.calledWithExactly(
          authorisationServerId,
          { fapiFinancialId, interactionId },
        ));
        done();
      });
  });
});

describe('/account-request-authorise-consent with error thrown by setupAccountRequest', () => {
  const status = 403;
  const message = 'message';
  const error = new Error(message);
  error.status = status;
  const setupAccountRequestStub = sinon.stub().throws(error);
  const authorisationEndpointStub = sinon.stub();
  const app = setupApp(setupAccountRequestStub, authorisationEndpointStub);

  it('returns status from error', (done) => {
    doPost(app)
      .end((e, r) => {
        assert.equal(r.status, status);
        assert.deepEqual(r.body, { message });
        const header = r.headers['access-control-allow-origin'];
        assert.equal(header, '*');
        assert(setupAccountRequestStub.calledWithExactly(
          authorisationServerId,
          { fapiFinancialId, interactionId },
        ));
        done();
      });
  });
});
