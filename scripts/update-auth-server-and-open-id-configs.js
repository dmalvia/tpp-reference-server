const path = require('path');
const dotenv = require('dotenv');
const debug = require('debug')('debug');
const log = require('debug')('log');

const ENVS = dotenv.load({ path: path.join(__dirname, '..', '.env') });
debug(`ENVs set: ${JSON.stringify(ENVS.parsed)}`);

const { updateOpenIdConfigs } = require('../app/authorisation-servers');
const { fetchOBAccountPaymentServiceProviders } = require('../app/ob-directory');

const cacheLatestConfigs = async () => {
  log('Running fetchOBAccountPaymentServiceProviders');
  await fetchOBAccountPaymentServiceProviders();

  log('Running updateOpenIdConfigs');
  await updateOpenIdConfigs();
};

cacheLatestConfigs().then(() => {
  if (process.env.NODE_ENV !== 'test') {
    process.exit();
  }
});

exports.cacheLatestConfigs = cacheLatestConfigs;
