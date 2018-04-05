const assert = require('assert');
const proxyquire = require('proxyquire');
const env = require('env-var');
const httpMocks = require('node-mocks-http');
const sinon = require('sinon');

const redirectionUrl = 'http://localhost:9999/tpp/authorized';
const clientId = 'id';
const clientSecret = 'secret';
const authorisationServerId = '123';
const accessToken = 'access-token';
const authorisationCode = '12345_67xxx';
const sessionId = 'testSession';
const username = 'testUser';
const scope = 'accounts';
const accountRequestId = 'testAccountRequestId';

const tokenRequestPayload = {
  grant_type: 'authorization_code', // eslint-disable-line quote-props
  code: authorisationCode,
  redirect_uri: redirectionUrl, // eslint-disable-line quote-props
};

const tokenResponsePayload = {
  access_token: accessToken,
  expires_in: 3600,
};

describe('Authorized Code Granted', () => {
  let redirection;
  let postTokenStub;
  let setConsentStub;
  let getClientCredentialsStub;
  let getUsernameStub;
  let request;
  let response;

  beforeEach(() => {
    setConsentStub = sinon.stub();
    postTokenStub = sinon.stub().returns(tokenResponsePayload);
    getClientCredentialsStub = sinon.stub().returns({ clientId, clientSecret });
    getUsernameStub = sinon.stub().returns(username);
    redirection = proxyquire('../../app/authorise/authorisation-code-granted.js', {
      'env-var': env.mock({
        SOFTWARE_STATEMENT_REDIRECT_URL: redirectionUrl,
      }),
      './obtain-access-token': { postToken: postTokenStub },
      '../authorisation-servers': {
        getClientCredentials: getClientCredentialsStub,
      },
      './consents': { setConsent: setConsentStub },
      '../session': {
        session: {
          getUsername: getUsernameStub,
        },
      },
    });

    request = httpMocks.createRequest({
      method: 'POST',
      url: '/tpp/authorized',
      headers: {
        authorization: sessionId,
      },
      body: {
        authorisationCode,
        authorisationServerId,
        scope,
        accountRequestId,
      },
    });
    response = httpMocks.createResponse();
  });

  afterEach(() => {
    postTokenStub.reset();
  });

  describe('redirect url configured', () => {
    it('handles the redirection route', async () => {
      await redirection.authorisationCodeGrantedHandler(request, response);
      assert.equal(response.statusCode, 204);
    });

    it('calls postToken to obtain an access token', async () => {
      await redirection.authorisationCodeGrantedHandler(request, response);
      assert(postTokenStub.calledWithExactly(
        authorisationServerId,
        clientId, clientSecret, tokenRequestPayload,
      ));
    });

    it('calls setConsent to store obtained consent', async () => {
      await redirection.authorisationCodeGrantedHandler(request, response);
      const { args } = setConsentStub.getCalls()[0];
      assert.deepEqual({ username, authorisationServerId, scope }, args[0]);
      assert.deepEqual(
        {
          username,
          authorisationServerId,
          scope,
          accountRequestId,
          expirationDateTime: null,
          authorisationCode,
          token: tokenResponsePayload,
        },
        args[1],
      );
    });

    describe('error handling', () => {
      const status = 403;
      const message = 'message';
      const error = new Error(message);
      error.status = status;

      beforeEach(() => {
        postTokenStub = sinon.stub().throws(error);
        getClientCredentialsStub = sinon.stub().returns({ clientId, clientSecret });
        redirection = proxyquire('../../app/authorise/authorisation-code-granted.js', {
          'env-var': env.mock({
            SOFTWARE_STATEMENT_REDIRECT_URL: redirectionUrl,
          }),
          './obtain-access-token': { postToken: postTokenStub },
          '../authorisation-servers': {
            getClientCredentials: getClientCredentialsStub,
          },
        });
      });

      it('relays errors including any upstream status', async () => {
        await redirection.authorisationCodeGrantedHandler(request, response);
        assert.equal(response.statusCode, status);
        // eslint-disable-next-line no-underscore-dangle
        assert.deepEqual(response._getData(), { message });
      });
    });
  });
});
