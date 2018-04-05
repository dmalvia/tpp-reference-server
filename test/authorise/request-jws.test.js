const { createClaims, createJsonWebSignature } = require('../../app/authorise/request-jws');
const { statePayload } = require('../../app/authorise/authorise-uri');
const assert = require('assert');

const payload = { example: 'claims' };

/**
  To generate signing cert/key on command line:

  org="my-org-id-from-open-banking-directory"
  client="id-for-my-client-from-open-banking-directory
  openssl req -new -newkey rsa:2048 -nodes -sha256 \
    -out signing.csr -keyout signing.key \
    -subj "/C=GB/O=Open Banking Limited/OU=${org}/CN=${client}"
*/

// npm run base64-cert-or-key signing.key
const signingKey = 'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBdkYxbTQwc2FBeS8vYkJtVFA0WG5LdE1aSXFScy9Xc241aXN3UjIrVkNFSGdGNFlIClNic1hhbTB1eG00V25veDJQbDdlaDBiZUtEMmVXcDRwaCt3VHYyeWJCdkN5UXMxV1MwbUFnZFYxTlFJRVQ4UHUKbmxyOW5VMERGeWhuN0RHSHp1MTRrMFFvQk8vVFZkSmdXOVJLRCtRUkw3SW1BMzZWNGFrWkgwdUlRa1RTTlM4dgpGcWlhbFEyRHArMlFVN0FyVnZYdHd1eHVQMEdBcFA4NTJyRG5xeUlacVltcXJudThWM2k3Y04xbkM3WHh5RW5oCmN4UWpSb1lwWHcxMS8wLzRUOVFGNHhYVzMvaVp3VzJ1VktTdWtMNElsc1M1UThSUEhXeW4xdGkwNnRwaVpVcisKbGxwVTg5dXMzM0VwaXJQYnNDSWtvR2ZkWW5WRnhMOGRsTGp2MXdJREFRQUJBb0lCQUYyOFNTZ1F4bmdSbVpUTQp3VmJhSnFoTDluVWp4OHp3VnlHV0dtZGlJcExDWFdhM1hzY1ZJRmpvemw4V2g1RU1xd2JzcE9aQ29PajdpT0xsClZCdDhvbk1lODZLbmdyMzFldHpxVGRYT1NJNUJXNjNwL2NPMTJnRStRcXh5Z2d5cXRUK0hNdnB0NzFCTm5DaFkKRVhXQkZmNEVhMzBGdFI4R0RrWUdwU2JLcXByMjBvbzZGLzFUZ3paM2RKazlMbTg3K2pmV1RmTlRYaXRTemJJRApMUUMwNkFBVkJ1V241RlJjNmVTTENKUTRzbDI0Vy84THYyVjFsaXhkRzVNdmlpWUFJc0thVTF6N3g1MCt3ZnBiCkN5YWNmc2V0YkJNVmltczNWTmlhTjA4YWVtY3Uvak9jSklNcTF4aFZpNFJmVFoxaVgrMk5MVDZ3bGJhZStzd2YKTms0TENnRUNnWUVBOWFkZEVyTDlVa1FCTFI4RGNzSll1elo1QVdxSVFZYkhTVlpVdHBzZ3BaYzZuRW9hbWZzdwpCRUhkN1I0eHcrVnBNbGk1Tm9QYUlFaTN3MDR2QThYakx4Ny9kNXplbWZnS3VkQzRYdkxFc251UWMxbkVMSExjCjdDZ21iTm9rZW8zRkkrYzlYeldibVZBdnVSMWR2Y1AzNHYwYWpHb2RVRHFqKzNvSGNZYjNDdGNDZ1lFQXhFeFoKai9yTlNtdWpNeGFhSVYwYlhIa1BJZEhpcU9WMnZ4RnVuckVIMTNqVnA5RjNrd2ljaTNLam5MNGZNK3JGTmVBdApqQVZnM3NnT3dCMVRUUTlYUVprb3VFSndZT2Q0azNQY0ZWSkJ4N2x1RTlWSnVteWVjb0k4emIvSTRsMHlsMEpXCm40aFA4UFBoelVPZ3FOVkxvQWZPQ3UxNHRqOHFMUmNuTmtTZG93RUNnWUVBb2JUVFVzemFicjN2WEVsdkZxc1MKaCtKNjAxRFNjdmdLMVo3cjB1elpGOGd1UDlXVUgwcTN1QVczMWpBcktENHErb1puSFppOERNWnhtVEl0UnJtTQpMR2VtV1pHOUF2UEI4OEdPckluNHExa2xwSmt4eHVTeHd3OUhCQjZ4SnErT1YyMFAvRTJvcU1xZEw2bENIUG9VCmdxcUVRR3hWOFlzNGlRRXlSeXhHRVM4Q2dZQkJjNk81V2tyeE1ZcXRFakE2UjYxRDNDbXJnU3d1WExTSGFPeVYKaFRtMEl0bzZwcUZVS1Y3cE1FUlZreDhjVkgrRlEwWnNsYTZER2ZteEhSWVZiN1FNYjJFZ2J5YkJhT3pQWGFaWQpoYURoVTNiY3JoVnpUNXhWV2cra0d2cUVYOGJxb0hmNW9aM21IYXVBb2JnRUUzcXYxV3BpUW1RcGdFNHowckNFCmE4U1VBUUtCZ0VEQjlMY1NnQ0NRNnFtTithZ1NDRCtsVW84REJ4aE1LaFRNWWtoRFNPNkw5TFEvUXMxTFRibm4KVFZ2YXlEQS95V1hWOU1CREltVm9peDRYTElLQVlpbTVCVWw0ekcvRkxDdFMzU0w2dzU4dlBERlB6eGtObmNmQgo2dHpySm1PbHRBY3Vuc3J5MEV6UjRDSE9QU2F1Tk85Z2pwMjYydXVFcVZIMEFhbExLNXptCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==';

const notSigned = 'eyJhbGciOiJub25lIn0.eyJleGFtcGxlIjoiY2xhaW1zIn0.';
const hs256signed = 'eyJhbGciOiJIUzI1NiJ9.eyJleGFtcGxlIjoiY2xhaW1zIn0.713fdImuJuKedy8Lm5E2alESqRpT4cma1mXZVdX07k4';
const rs256signed = 'eyJhbGciOiJSUzI1NiJ9.eyJleGFtcGxlIjoiY2xhaW1zIn0.dWC5Q4R0c7JZgQ6VuiYpYsPNEeNKPW9Zj55VEDDrj0RqWZc72v4sK-en2qZGW_7ETGFhfUBvViP4Y746E-6eDsZFtzkFGclkXCDvPYr8ey0XsS0aASAaAjTMmY98FdTL-6FVEXwxZ8t6rvle77TGVBdq0wk0DTMishnpD_2roIQALWzDfPXtV31GY0L9L9uOcHopGYgSTAw81CLgWvr98an-li1Q8D8okp4yt_bmPw8mlKN8HI-bUiCStKIiYtze_h029VYphlD8ASqrmTjCQpRiJldTi3OroEoKPQk7MaYZH2kJuJMXnIKXdxfEcKcMh1YsUFhedd2ktlot73O8mw';
const ps256signed = 'MTgBz7RzMoTm0K8c8z1_2ldEqnA2z7qLKdJ8fXcGRxK6RZonr2aM6HVwRE24J74HA9wV6vf8N_wtccw_1_7_8pUP5Jqe-Iyz2SnDldGO7ZPEWm8g9zmNJk5_AqqkTUCcGfinJKPNw_2cmIENrI-h5hjum0AOjKomNUJBpbsnzdSgDt9im9F_nl-GKpIuy-b3PxR-eQ_wyJtqGffJmq7HshTI_tZizTm_D0u26JVTSDK_DtxH0tYHvTxxWu3qmlOiXmgtvfb7TCJcQgtSq40Qs6ap5QQJv-zP6EsA67uN1Bk902N6u9MFQcSDgbCyyNgXixS9XhF_UWbQ6nnp-T78NQ';

describe('createJsonWebSignature when signing key present', () => {
  before(() => { process.env.SIGNING_KEY = signingKey; });
  after(() => { delete process.env.SIGNING_KEY; });

  describe('with signing algs ["none"]', () => {
    it('creates JWS', async () => {
      const jws = await createJsonWebSignature(payload, ['none']);
      assert.equal(jws, notSigned);
    });
  });

  describe('with signing algs ["HS256"]', () => {
    it('creates JWS', async () => {
      const jws = await createJsonWebSignature(payload, ['HS256'], 'testClientSecret');
      assert.equal(jws, hs256signed);
    });
  });

  describe('with signing algs ["RS256"]', () => {
    it('creates JWS', async () => {
      const jws = await createJsonWebSignature(payload, ['RS256']);
      assert.equal(jws, rs256signed);
    });
  });

  describe('with signing algs ["PS256"]', () => {
    it('creates JWS', async () => {
      const jws = await createJsonWebSignature(payload, ['PS256']);
      assert.equal(jws, ps256signed);
    });
  });

  describe('with non-supported signing algs', () => {
    it('throws error', async () => {
      try {
        await createJsonWebSignature(payload, ['RS512']);
        assert.ok(false);
      } catch (error) {
        assert.equal(error.name, 'Error');
      }
    });
  });

  describe('with signing algs ["PS256", "HS256"]', () => {
    it('creates JWS with PS256', async () => {
      const jws = await createJsonWebSignature(payload, ['PS256', 'HS256'], 'testClientSecret');
      assert.equal(jws, ps256signed);
    });
  });

  describe('with signing algs ["PS256", "none"]', () => {
    it('creates JWS with PS256', async () => {
      const jws = await createJsonWebSignature(payload, ['PS256', 'none'], 'testClientSecret');
      assert.equal(jws, ps256signed);
    });
  });
});

describe('createJsonWebSignature when no signing key present', () => {
  describe('with signing algs ["ES256", "none"]', () => {
    it('creates JWS defaulting to none', async () => {
      const jws = await createJsonWebSignature(payload, ['ES256', 'none'], 'testClientSecret');
      assert.equal(jws, notSigned);
    });
  });

  describe('with signing algs ["ES256", "HS256"]', () => {
    it('creates JWS defaulting to HS256', async () => {
      const jws = await createJsonWebSignature(payload, ['ES256', 'HS256'], 'testClientSecret');
      assert.equal(jws, hs256signed);
    });
  });
});

describe('createClaims', () => {
  const accountRequestId = 'testAccountRequestId';
  const clientId = 'testClientId';
  const scope = 'openid accounts';
  const authServerIssuer = 'http://aspsp.example.com';
  const registeredRedirectUrl = 'http://tpp.example.com/handle-authorise';
  const authorisationServerId = 'testAuthorisationServerId';
  const sessionId = 'testSessionId';
  const state = statePayload(authorisationServerId, sessionId);

  const expectedClaims = audience => ({
    aud: audience,
    iss: clientId,
    response_type: 'code',
    client_id: clientId,
    redirect_uri: registeredRedirectUrl,
    scope,
    state,
    nonce: 'dummy-nonce',
    max_age: 86400,
    claims:
    {
      userinfo:
      {
        openbanking_intent_id: { value: accountRequestId, essential: true },
      },
      id_token:
      {
        openbanking_intent_id: { value: accountRequestId, essential: true },
        acr: {
          essential: true,
        },
      },
    },
  });

  it('creates claims JSON successfully when useOpenidConnect is false', () => {
    const useOpenidConnect = false;
    const claims = createClaims(
      scope, accountRequestId, clientId, authServerIssuer,
      registeredRedirectUrl, state, useOpenidConnect,
    );
    assert.deepEqual(claims, expectedClaims(authServerIssuer));
  });

  it('creates claims JSON successfully when useOpenidConnect is true', () => {
    const useOpenidConnect = true;
    const claims = createClaims(
      scope, accountRequestId, clientId, authServerIssuer,
      registeredRedirectUrl, state, useOpenidConnect,
    );
    assert.deepEqual(claims, expectedClaims(authServerIssuer));
  });
});
