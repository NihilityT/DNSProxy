const dgram = require("node:dgram");
const DnsPacket = require("native-dns-packet");
const { DNS } = require("./proxies/DNS");
const { DoH } = require("./proxies/DoH");
const { Logger } = require("./Logger");

const logger = Logger('server');
const server = dgram.createSocket('udp4');
const doh = new DoH();
const dns = new DNS();

server.on('error', (err) => {
  logger.error('error', err);
  server.close();
});

server.on('message', (msg, rinfo) => {
  const dnsPacket = DnsPacket.parse(msg);
  logger.info(
    `client [${rinfo.address}:${rinfo.port}]\n> ${JSON.stringify(dnsPacket)}`
  );
  const handle = ({ message, source }) => {
    const dnsPacket = DnsPacket.parse(message);
    logger.info(
      `client [${rinfo.address}:${
        rinfo.port
      }] DNS [${source}]\n> ${JSON.stringify(dnsPacket)}\n`
    );
    server.send(message, rinfo.port, rinfo.address);
  };
  doh
    .resolveMsg(msg)
    .catch((err) => {
      logger.error('error', err);
      return dns.resolveMsg(msg);
    })
    .then(handle, () => {
      const dnsPacket = DnsPacket.parse(msg);
      dnsPacket.header.rcode = DnsPacket.consts.NAME_TO_RCODE.SERVFAIL;
      dnsPacket.header.qr = 1;
      const dnsMessage = Buffer.alloc(128);
      const len = DnsPacket.write(dnsMessage, dnsPacket);
      logger.info(
        `client [${rinfo.address}:${rinfo.port}] DNS []\n> ${JSON.stringify(
          dnsPacket
        )}\n`
      );
      server.send(dnsMessage.subarray(0, len), rinfo.port, rinfo.address);
    });
});

server.on('listening', () => {
  const address = server.address();
  logger.info(`listening ${address.address}:${address.port}`);
});

server.bind(53, 'localhost');