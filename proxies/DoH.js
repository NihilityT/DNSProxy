const DnsPacket = require("native-dns-packet");
const { Logger } = require("../Logger");
const { DNS } = require("./DNS");

class DoH extends DNS {
  static logger = Logger('DoH');
  static defaultServers = [
    'https://cn-a.iqiqz.com/dns-query',
    // alidns
    'https://223.5.5.5/dns-query',
    'https://223.6.6.6/dns-query',
    // dnspod
    'https://1.12.12.12/dns-query',
    'https://120.53.53.53/dns-query',
  ];
  static async resolveMsg(dnsMessage, servers = this.defaultServers) {
    if (servers.length == 0) {
      return new Error('empty DoH servers');
    }

    const dnsPacket = DnsPacket.parse(dnsMessage);
    const id = dnsPacket.header.id;
    dnsPacket.header.id = 0;
    const message = Buffer.alloc(dnsMessage.length);
    DnsPacket.write(message, dnsPacket);

    const index = servers.findIndex(s => {
      const hostname = new URL(s).hostname;
      return dnsPacket.question.some(q => q.type == DnsPacket.consts.NAME_TO_QTYPE.A && q.name == hostname);
    });
    if (index != -1) {
      servers = servers.slice(index + 1);
    }

    const server = servers[0];
    return new Promise((resolve, reject) => {
      const resolveNext = (reason, data) => {
        this.logger.error(`DNS [${server}]`, reason, data);
        if (servers.length > 1) {
          return this.resolveMsg(dnsMessage, servers.slice(1)).then(resolve, reject);
        } else if (data != null) {
          return resolve({ message: data, source: server });
        } else {
          reject(new Error(reason));
        }
      };

      // console.log(JSON.stringify(message));
      const base64 = message.toString('base64url').replace(/=+$/, '');
      let timeoutId = setTimeout(() => {
        timeoutId = 0
        resolveNext('timeout')
      }, 500);
      // this.logger.info(base64);
      fetch(`${server}?dns=${base64}`, {
        "headers": {
          "accept": "application/dns-message",
        },
      }).then(async response => {
        clearTimeout(timeoutId);
        // this.logger.log('success', x, x.headers);
        if (response.status != 200) {
          const text = await response.text();
          return resolveNext(`status: [${response.status}], data: [${text}]`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const packet = DnsPacket.parse(buffer);
        packet.header.id = id;
        this.logger.info('send', server, JSON.stringify(dnsPacket));
        this.logger.info('recv', server, JSON.stringify(packet));
        if (timeoutId == 0) {
          return;
        }

        DnsPacket.write(buffer, packet);
        if (packet.header.rcode != DnsPacket.consts.NAME_TO_RCODE.NOERROR) {
          return resolveNext(
            `rcode: [${DnsPacket.consts.RCODE_TO_NAME[packet.header.rcode]}:${packet.header.rcode
            }]`,
            buffer
          );
        }
        return resolve({ message: buffer, source: server });
      }).catch(e => {
        clearTimeout(timeoutId);
        if (timeoutId == 0) {
          return;
        }
        resolveNext(e);
      });
    });
  }
}
exports.DoH = DoH;
