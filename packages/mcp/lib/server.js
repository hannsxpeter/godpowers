const { McpServer } = require('@modelcontextprotocol/server');
const { serveStdio: serveStdioTransport } = require('@modelcontextprotocol/server/stdio');

const pkg = require('../package.json');
const tools = require('./tools');

function createServer(opts = {}) {
  const server = new McpServer({
    name: 'godpowers-mcp',
    version: pkg.version
  });
  tools.registerTools(server, opts);
  return server;
}

async function serveStdio(opts = {}) {
  return serveStdioTransport(() => createServer(opts));
}

module.exports = {
  createServer,
  serveStdio
};
