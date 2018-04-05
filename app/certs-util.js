
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0; // To enable use of self signed certs

const mtlsEnabled = process.env.MTLS_ENABLED === 'true';
const ca = Buffer.from(process.env.OB_ISSUING_CA || '', 'base64').toString();
const cert = Buffer.from(process.env.TRANSPORT_CERT || '', 'base64').toString();
const key = () => Buffer.from(process.env.TRANSPORT_KEY || '', 'base64').toString();

const setupMutualTLS = agent => (mtlsEnabled ? agent.key(key()).cert(cert).ca(cert) : agent);

exports.setupMutualTLS = setupMutualTLS;
exports.caCert = ca;
exports.clientCert = cert;
exports.clientKey = key;
exports.mtlsEnabled = mtlsEnabled;
