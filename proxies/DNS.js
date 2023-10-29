const DnsPacket = require("native-dns-packet");
const dgram = require("node:dgram");
const { Logger } = require("../Logger");
const { DNSClient } = require("./Client");

class DNS extends DNSClient {
  static logger = Logger('DNS');
  static defaultServers = [
    // dnspod
    '119.29.29.29',
    // alidns
    '223.5.5.5',
    '223.6.6.6',
  ];

  static async resolveMsg(dnsMessage, servers = this.defaultServers) {
    if (servers.length == 0) {
      return new Error('empty DNS servers');
    }
    return new Promise((resolve, reject) => {
      const resolveNext = (reason, data) => {
        this.logger.error(`DNS [${server}]`, reason, data);
        if (servers.length > 1) {
          return this.resolveMsg(dnsMessage, servers.slice(1));
        } else if (data != null) {
          return resolve({ message: data, source: server });
        } else {
          reject(new Error(reason));
        }
      };

      const server = servers[0];
      const serverInfo = server.split(':');
      const host = serverInfo[0];
      const port = +serverInfo[1] || 53;
      const client = dgram.createSocket('udp4');
      client.on('message', (msg) => {
        this.logger.info('message', msg);
        const packet = DnsPacket.parse(msg);
        if (packet.header.rcode != DnsPacket.consts.NAME_TO_RCODE.NOERROR) {
          return resolveNext(
            `rcode: [${DnsPacket.consts.RCODE_TO_NAME[packet.header.rcode]}:${packet.header.rcode
            }]`,
            msg
          );
        }
        resolve({ message: msg, source: server });
        client.close();
      });
      client.send(dnsMessage, port, host, (err) => {
        if (err) {
          resolveNext(err);
          client.close();
        }
      });
    });
  }
}
exports.DNS = DNS;
