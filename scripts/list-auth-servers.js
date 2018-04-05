const path = require('path');
const dotenv = require('dotenv');
const debug = require('debug')('debug');

const ENVS = dotenv.load({ path: path.join(__dirname, '..', '.env') });
debug(`ENVs set: ${JSON.stringify(ENVS.parsed)}`);

const { allAuthorisationServers } = require('../app/authorisation-servers');

const authServerRows = async () => {
  const header = [
    'id',
    'CustomerFriendlyName',
    'OrganisationCommonName',
    'Authority',
    'OBOrganisationId',
    'clientCredentialsPresent',
    'openIdConfigPresent',
  ].join('\t');
  const rows = [header];
  const list = await allAuthorisationServers();
  list.forEach((item) => {
    const config = item.obDirectoryConfig;
    const authorityPresent = config && config.AuthorityId
      && config.MemberState && config.RegistrationId;
    const line = [
      item.id,
      config ? config.CustomerFriendlyName : '',
      config ? config.OrganisationCommonName : '',
      authorityPresent ? `${config.MemberState}:${config.AuthorityId}:${config.RegistrationId}` : '',
      config ? config.OBOrganisationId : '',
      !!item.clientCredentials,
      !!item.openIdConfig,
    ].join('\t');
    rows.push(line);
  });
  return rows;
};

authServerRows().then((rows) => {
  if (process.env.NODE_ENV !== 'test') {
    rows.forEach(row => console.log(row)); // eslint-disable-line
    process.exit();
  }
});

exports.authServerRows = authServerRows;
