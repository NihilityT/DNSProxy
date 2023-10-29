const DnsPacket = require("native-dns-packet");
const dgram = require("node:dgram");
const { Logger } = require("../Logger");

class Client {
  static logger = Logger('DNSClient');
  static defaultServers = [];
  servers;

  constructor(servers) {
    this.servers = servers || this.constructor.defaultServers;
  }

  async resolveMsg(dnsMessage) {
    return this.constructor.resolveMsg(dnsMessage, this.servers);
  }

  async resolve(hostname) {
    return this.constructor.resolve(hostname, this.servers);
  }

  static async resolveMsg(dnsMessage, servers = this.defaultServers) {
      return new Error('Not Implemented');
  }

  static async resolve(hostname, servers = this.defaultServers) {
    this.logger.log(servers);
    const dnsPacket = new DnsPacket();
    dnsPacket.question.push({
      name: hostname,
      type: DnsPacket.consts.NAME_TO_QTYPE.A,
      class: DnsPacket.consts.NAME_TO_QCLASS.IN,
    });
    const dnsMessage = Buffer.alloc(128);
    const len = DnsPacket.write(dnsMessage, dnsPacket);

    return this.resolveMsg(dnsMessage.subarray(0, len), servers);
  }
}
exports.DNSClient = Client;
