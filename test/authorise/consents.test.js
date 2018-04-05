const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const {
  setConsent,
  consent,
  consentAccessToken,
  consentAccountRequestId,
  deleteConsent,
  getConsent,
} = require('../../app/authorise');
const { AUTH_SERVER_USER_CONSENTS_COLLECTION } = require('../../app/authorise/consents');

const { drop } = require('../../app/storage.js');

const username = 'testUsername';
const authorisationServerId = 'a123';
const scope = 'accounts';
const keys = { username, authorisationServerId, scope };

const accountRequestId = 'xxxxxx-xxxx-43c6-9c75-eaf01821375e';
const authorisationCode = 'spoofAuthCode';
const token = 'testAccessToken';
const tokenPayload = {
  access_token: token,
  expires_in: 3600,
  token_type: 'bearer',
};

const consentPayload = {
  username,
  authorisationServerId,
  scope,
  accountRequestId,
  expirationDateTime: null,
  authorisationCode,
  token: tokenPayload,
};

const consentStatus = 'Authorised';

describe('setConsents', () => {
  beforeEach(async () => {
    await drop(AUTH_SERVER_USER_CONSENTS_COLLECTION);
  });

  afterEach(async () => {
    await drop(AUTH_SERVER_USER_CONSENTS_COLLECTION);
  });

  it('stores payload and allows consent to be retrieved by keys id', async () => {
    await setConsent(keys, consentPayload);
    const stored = await consent(keys);
    assert.equal(stored.id, `${username}:::${authorisationServerId}:::${scope}`);
  });

  it('stores payload and allows consent access_token to be retrieved', async () => {
    await setConsent(keys, consentPayload);
    const storedAccessToken = await consentAccessToken(keys);
    assert.equal(storedAccessToken, token);
  });

  it('stores payload and allows consent accountRequestId to be retrieved', async () => {
    await setConsent(keys, consentPayload);
    const storedAccountRequestId = await consentAccountRequestId(keys);
    assert.equal(storedAccountRequestId, accountRequestId);
  });
});

describe('deleteConsent', () => {
  beforeEach(async () => {
    await drop(AUTH_SERVER_USER_CONSENTS_COLLECTION);
  });

  afterEach(async () => {
    await drop(AUTH_SERVER_USER_CONSENTS_COLLECTION);
  });

  it('stores payload and allows consent to be retrieved by keys id', async () => {
    await setConsent(keys, consentPayload);
    await deleteConsent(keys);
    const result = await getConsent(keys);
    assert.equal(result, null);
  });
});

describe('filterConsented', () => {
  const getAccountRequestStub = sinon.stub().returns({ Data: { Status: consentStatus } });
  let filterConsented;
  beforeEach(() => {
    ({ filterConsented } = proxyquire(
      '../../app/authorise/consents.js',
      {
        './setup-request': {
          accessTokenAndResourcePath: () => ({}),
        },
        '../setup-account-request/account-requests': {
          getAccountRequest: getAccountRequestStub,
        },
        '../authorisation-servers': {
          fapiFinancialIdFor: () => 'id',
        },
      },
    ));
  });

  afterEach(async () => {
    await drop(AUTH_SERVER_USER_CONSENTS_COLLECTION);
  });

  describe('given authorisationServerId with authorisationCode and authorised status', () => {
    beforeEach(async () => {
      await setConsent(keys, consentPayload);
    });

    it('returns array containing authorisationServerId', async () => {
      const consented = await filterConsented(username, scope, [authorisationServerId]);
      assert.deepEqual(consented, [authorisationServerId]);
    });
  });

  describe('given authorisationServerId with no authorisationCode in config', () => {
    beforeEach(async () => {
      await setConsent(keys, Object.assign(consentPayload, { authorisationCode: null }));
    });

    it('returns empty array', async () => {
      const consented = await filterConsented(username, scope, [authorisationServerId]);
      assert.deepEqual(consented, []);
    });
  });

  describe('given authorisationServerId with status revoked', () => {
    beforeEach(async () => {
      getAccountRequestStub.returns({ Data: { Status: 'Revoked' } });
      await setConsent(keys, Object.assign(consentPayload, { authorisationCode: null }));
    });

    it('returns empty array', async () => {
      const consented = await filterConsented(username, scope, [authorisationServerId]);
      assert.deepEqual(consented, []);
    });
  });

  describe('given authorisationServerId without config', () => {
    it('returns empty array', async () => {
      const consented = await filterConsented(username, scope, [authorisationServerId]);
      assert.deepEqual(consented, []);
    });
  });
});

describe('getConsentStatus', () => {
  const fapiFinancialId = 'testFapiFinancialId';
  const grantCredentialToken = 'grant-credential-access-token';
  const resourcePath = 'http://resource-server.com/open-banking/v1.1';
  const getAccountRequestStub = sinon.stub();
  let getConsentStatus;

  describe('successful', () => {
    beforeEach(() => {
      getAccountRequestStub.returns({ Data: { Status: consentStatus } });
      ({ getConsentStatus } = proxyquire(
        '../../app/authorise/consents.js',
        {
          './setup-request': {
            accessTokenAndResourcePath: () => ({ accessToken: grantCredentialToken, resourcePath }),
          },
          '../setup-account-request/account-requests': {
            getAccountRequest: getAccountRequestStub,
          },
          '../authorisation-servers': {
            fapiFinancialIdFor: () => fapiFinancialId,
          },
        },
      ));
    });

    it('makes remote call to get account request', async () => {
      await getConsentStatus(accountRequestId, authorisationServerId);
      assert(getAccountRequestStub.calledWithExactly(
        accountRequestId,
        resourcePath,
        grantCredentialToken,
        fapiFinancialId,
      ));
    });

    it('gets the status for an existing consent', async () => {
      const actual = await getConsentStatus(accountRequestId, authorisationServerId);
      assert.equal(actual, consentStatus);
    });
  });

  describe('errors', () => {
    it('throws error for missing payload', async () => {
      try {
        await getConsentStatus(accountRequestId, authorisationServerId);
      } catch (err) {
        assert(err);
      }
    });

    it('throws error for missing Data payload', async () => {
      getAccountRequestStub.returns({});
      try {
        await getConsentStatus(accountRequestId, authorisationServerId);
      } catch (err) {
        assert(err);
      }
    });
  });
});
