const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { accessTokenAndResourcePath } = require('../../app/authorise'); // eslint-disable-line

const authorisationServerId = 'testAuthorisationServerId';

describe('accessTokenAndResourcePath called with valid parameters', () => {
  const token = 'access-token';
  const resourceServerPath = 'http://resource-server.com/open-banking/v1.1';
  const tokenStub = sinon.stub().returns(token);
  const resourceServerPathStub = sinon.stub().returns(resourceServerPath);
  const accessTokenAndResourcePathProxy = proxyquire('../../app/authorise/setup-request', {
    './obtain-access-token': { createAccessToken: tokenStub },
    '../authorisation-servers': {
      resourceServerPath: resourceServerPathStub,
    },
  }).accessTokenAndResourcePath;

  it('returns accessToken and resourcePath', async () => {
    const { accessToken, resourcePath } =
      await accessTokenAndResourcePathProxy(authorisationServerId);
    assert(tokenStub.calledWithExactly(authorisationServerId), 'postToken called correctly');

    assert.equal(resourcePath, resourceServerPath);
    assert.equal(accessToken, token);
  });
});
