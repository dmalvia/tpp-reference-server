const {
  allAuthorisationServers,
  authorisationEndpoint,
  issuer,
  fapiFinancialIdFor,
  requireAuthorisationServerId,
  authorisationServersForClient,
  storeAuthorisationServers,
  tokenEndpoint,
  resourceServerHost,
  resourceServerPath,
  updateOpenIdConfigs,
  getClientCredentials,
  updateClientCredentials,
  requestObjectSigningAlgs,
  idTokenSigningAlgs,
} = require('./authorisation-servers');

exports.allAuthorisationServers = allAuthorisationServers;
exports.authorisationServersForClient = authorisationServersForClient;
exports.authorisationEndpoint = authorisationEndpoint;
exports.issuer = issuer;
exports.fapiFinancialIdFor = fapiFinancialIdFor;
exports.requireAuthorisationServerId = requireAuthorisationServerId;
exports.storeAuthorisationServers = storeAuthorisationServers;
exports.tokenEndpoint = tokenEndpoint;
exports.resourceServerHost = resourceServerHost;
exports.resourceServerPath = resourceServerPath;
exports.updateOpenIdConfigs = updateOpenIdConfigs;
exports.getClientCredentials = getClientCredentials;
exports.updateClientCredentials = updateClientCredentials;
exports.requestObjectSigningAlgs = requestObjectSigningAlgs;
exports.idTokenSigningAlgs = idTokenSigningAlgs;
