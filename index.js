const port = process.env.PORT || 8003;
const { app } = require('./app');
const log = require('debug')('log');

app.listen(port);

log(` App listening on port ${port}`);
