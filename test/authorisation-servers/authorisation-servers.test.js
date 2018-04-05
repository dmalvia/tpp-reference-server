const assert = require('assert');

const { drop } = require('../../app/storage.js');
const { ASPSP_AUTH_SERVERS_COLLECTION } = require('../../app/authorisation-servers/authorisation-servers');
const {
  allAuthorisationServers,
  authorisationEndpoint,
  storeAuthorisationServers,
  tokenEndpoint,
  resourceServerHost,
  resourceServerPath,
  updateOpenIdConfigs,
  getClientCredentials,
  updateClientCredentials,
  fapiFinancialIdFor,
  requestObjectSigningAlgs,
  idTokenSigningAlgs,
} = require('../../app/authorisation-servers');

const nock = require('nock');

const authServerId = 'aaaj4NmBD8lQxmLh2O9FLY';
const baseApiDNSUri = 'http://aaa.example.com/some/path/open-banking/v1.1';
const resourcePath = 'http://aaa.example.com/some/path';
const orgId = 'aaa-example-org';
const flattenedObDirectoryAuthServerList = [
  {
    Id: authServerId,
    BaseApiDNSUri: baseApiDNSUri,
    CustomerFriendlyName: 'AAA Example Bank',
    OpenIDConfigEndPointUri: 'http://example.com/openidconfig',
    OBOrganisationId: orgId,
  },
];

const expectedAuthEndpoint = 'http://auth.example.com/authorize';
const expectedTokenEndpoint = 'http://auth.example.com/token';
const expectedRequestAlgorithms = ['HS256', 'RS256'];
const expectedIdTokenAlgorithms = ['HS256', 'PS256'];
const openIdConfig = {
  authorization_endpoint: expectedAuthEndpoint,
  id_token_signing_alg_values_supported: expectedIdTokenAlgorithms,
  request_object_signing_alg_values_supported: expectedRequestAlgorithms,
  token_endpoint: expectedTokenEndpoint,
};

const clientCredentials = {
  clientId: 'a-client-id',
  clientSecret: 'a-client-secret',
};

const withOpenIdConfig = {
  id: authServerId,
  obDirectoryConfig: {
    BaseApiDNSUri: baseApiDNSUri,
    CustomerFriendlyName: 'AAA Example Bank',
    OpenIDConfigEndPointUri: 'http://example.com/openidconfig',
    Id: authServerId,
    OBOrganisationId: 'aaa-example-org',
  },
  openIdConfig,
};

const withClientCredsConfig = {
  id: authServerId,
  obDirectoryConfig: {
    BaseApiDNSUri: baseApiDNSUri,
    CustomerFriendlyName: 'AAA Example Bank',
    OpenIDConfigEndPointUri: 'http://example.com/openidconfig',
    Id: authServerId,
    OBOrganisationId: 'aaa-example-org',
  },
  clientCredentials,
};

describe('authorisation servers', () => {
  beforeEach(async () => {
    await drop(ASPSP_AUTH_SERVERS_COLLECTION);
    await storeAuthorisationServers(flattenedObDirectoryAuthServerList);
  });

  afterEach(async () => {
    await drop(ASPSP_AUTH_SERVERS_COLLECTION);
  });

  describe('fapiFinancialIdFor', () => {
    it('returns fapiFinancialId given valid authServerId', async () => {
      const id = await fapiFinancialIdFor(authServerId);
      assert.equal(id, orgId);
    });

    it('throws error given invalid authServerId', async () => {
      try {
        await fapiFinancialIdFor('invalid-id');
        assert.ok(false);
      } catch (err) {
        assert.equal(err.status, 500);
      }
    });
  });

  describe('getClientCredentials', () => {
    beforeEach(async () => {
      await updateClientCredentials(authServerId, clientCredentials);
    });

    describe('called with invalid authServerId', () => {
      it('throws error', async () => {
        try {
          await getClientCredentials('invalid-id');
          assert.ok(false);
        } catch (err) {
          assert.equal(err.status, 500);
        }
      });
    });

    it('retrieves client credentials for an authorisationServerId', async () => {
      const found = await getClientCredentials(authServerId);
      assert.deepEqual(found, clientCredentials);
    });
  });

  describe('updateClientCredentials', () => {
    it('before called clientCredentials not present', async () => {
      const list = await allAuthorisationServers();
      const authServerConfig = list[0];
      assert.ok(!authServerConfig.clientCredentials, 'clientCredentials not present');
    });

    it('stores clientCredential in db', async () => {
      await updateClientCredentials(authServerId, clientCredentials);
      const list = await allAuthorisationServers();
      const authServerConfig = list[0];
      assert.ok(authServerConfig.clientCredentials, 'clientCredentials present');
      assert.deepEqual(authServerConfig, withClientCredsConfig);
    });
  });

  describe('authorisationEndpoint called with invalid authServerId', () => {
    it('throws 500 status error', async () => {
      try {
        await authorisationEndpoint('invalid-id');
        assert.ok(false);
      } catch (err) {
        assert.equal(err.status, 500);
      }
    });
  });

  describe('tokenEndpoint called with invalid authServerId', () => {
    it('throws 500 status error', async () => {
      try {
        await tokenEndpoint('invalid-id');
        assert.ok(false);
      } catch (err) {
        assert.equal(err.status, 500);
      }
    });
  });

  describe('resourceServerHost called with invalid authServerId', () => {
    it('returns null', async () => {
      try {
        await resourceServerHost('invalid-id');
        assert.ok(false);
      } catch (err) {
        assert.equal(err.status, 500);
      }
    });
  });

  describe('resourceServerHost', () => {
    it('returns BaseApiDNSUri host', async () => {
      const host = await resourceServerHost(authServerId);
      assert.equal(host, baseApiDNSUri);
    });
  });

  describe('resourceServerPath', () => {
    it('returns BaseApiDNSUri host plus path', async () => {
      const path = await resourceServerPath(authServerId);
      assert.equal(path, resourcePath);
    });
  });

  describe('updateOpenIdConfigs', () => {
    nock(/example\.com/)
      .get('/openidconfig')
      .reply(200, openIdConfig);

    it('before called openIdConfig not present', async () => {
      const list = await allAuthorisationServers();
      const authServerConfig = list[0];
      assert.ok(!authServerConfig.openIdConfig, 'openIdConfig not present');
    });

    it('retrieves openIdConfig and stores in db', async () => {
      await updateOpenIdConfigs();
      const list = await allAuthorisationServers();
      const authServerConfig = list[0];
      assert.ok(authServerConfig.openIdConfig, 'openIdConfig present');
      assert.deepEqual(authServerConfig, withOpenIdConfig);

      const authEndpoint = await authorisationEndpoint(authServerId);
      assert.equal(authEndpoint, expectedAuthEndpoint);

      const tokenUrl = await tokenEndpoint(authServerId);
      assert.equal(tokenUrl, expectedTokenEndpoint);

      const requestAlgorithms = await requestObjectSigningAlgs(authServerId);
      assert.deepEqual(requestAlgorithms, expectedRequestAlgorithms);

      const idTokenAlgorithms = await idTokenSigningAlgs(authServerId);
      assert.deepEqual(idTokenAlgorithms, expectedIdTokenAlgorithms);
    });
  });
});

exports.flattenedObDirectoryAuthServerList = flattenedObDirectoryAuthServerList;
exports.clientCredentials = clientCredentials;
exports.openIdConfig = openIdConfig;
