const proxyquire = require('proxyquire');
const assert = require('assert');
const nock = require('nock');
const sinon = require('sinon');

const authServerId = 'testAuthServerId';

const clientId = 's6BhdRkqt3';
const clientSecret = '7Fjfp0ZBr1KtDRbnfVdmIw';
const credentials = 'Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3';
const samplePayload = {
  scope: 'accounts',
  grant_type: 'client_credentials',
};

const getClientCredentialsStub = sinon.stub().returns({ clientId, clientSecret });

const postTokenFn = tokenEndpointStub => proxyquire('../../app/authorise/obtain-access-token', {
  '../authorisation-servers': {
    tokenEndpoint: tokenEndpointStub,
  },
}).postToken;

const createTokenFn = tokenEndpointStub => proxyquire('../../app/authorise/obtain-access-token', {
  '../authorisation-servers': {
    tokenEndpoint: tokenEndpointStub,
    getClientCredentials: getClientCredentialsStub,
  },
}).createAccessToken;

describe('POST /token 200 response', () => {
  const tokenEndpointStub = sinon.stub().returns('http://example.com/token');
  const createToken = createTokenFn(tokenEndpointStub);
  const response = {
    access_token: 'accessToken',
    expires_in: 3600,
    token_type: 'bearer',
    scope: 'accounts',
  };

  nock(/example\.com/)
    .post('/token')
    .matchHeader('authorization', credentials)
    .reply(200, response);

  it('returns token from createToken when 200 OK', async () => {
    const token = await createToken(authServerId);
    assert.equal(token, 'accessToken');
  });
});

describe('POST /token non 200 response', () => {
  const tokenEndpointStub = sinon.stub().returns('http://example.com/token');
  const postToken = postTokenFn(tokenEndpointStub);
  nock(/example\.com/)
    .post('/token')
    .matchHeader('authorization', credentials)
    .reply(403);

  it('throws error with response status', async () => {
    try {
      await postToken(authServerId, clientId, clientSecret, samplePayload);
      assert.ok(false);
    } catch (error) {
      assert.equal(error.name, 'Error');
      assert.equal(error.message, 'Forbidden');
      assert.equal(error.status, 403);
    }
  });
});

describe('POST /token error sending request', () => {
  const tokenEndpointStub = sinon.stub().returns('bad-url');
  const postToken = postTokenFn(tokenEndpointStub);
  it('throws error with status set to 500', async () => {
    try {
      await postToken(authServerId, clientId, clientSecret, samplePayload);
      assert.ok(false);
    } catch (error) {
      assert.equal(error.name, 'Error');
      assert.equal(error.message, 'getaddrinfo ENOTFOUND bad-url bad-url:80');
      assert.equal(error.status, 500);
    }
  });
});
