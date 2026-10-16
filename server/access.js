'use strict';
// 访问统计日志：只记“时间、事件、IP、随机浏览器编号、是否像机器人”，不记搜索词；文件仅本人可读，超过保留天数的行会被删除。
// 每行以制表符分隔：ISO 时间 \t 事件(page|search|job) \t IP \t 浏览器编号 \t 机器人(0|1)
const fs = require('node:fs');
const VISITOR = /^[A-Za-z0-9-]{8,64}$/;
const BOT = /bot|spider|crawl|slurp|curl|wget|python|scrapy|headless|monitor|uptime|check/i;

function createAccessLog(file, { days = 30, now = Date.now } = {}) {
  if (!file) return { record() {}, prune() {} };
  return {
    record(event, req, ip) {
      const id = String(req.headers['x-visitor-id'] || ''), bot = BOT.test(String(req.headers['user-agent'] || '')) ? 1 : 0;
      // shortcut: 同步追加，量很小；访问量大到影响响应时改成批量写。
      try { fs.appendFileSync(file, [new Date(now()).toISOString(), event, ip, VISITOR.test(id) ? id : '', bot].join('\t') + '\n', { mode: 0o600 }); } catch {}
    },
    prune() {
      try {
        const cutoff = new Date(now() - days * 864e5).toISOString(), temp = file + '.tmp';
        const kept = fs.readFileSync(file, 'utf8').split('\n').filter(line => line && line.slice(0, 24) >= cutoff);
        fs.writeFileSync(temp, kept.length ? kept.join('\n') + '\n' : '', { mode: 0o600 });
        fs.renameSync(temp, file);
      } catch {}
    }
  };
}

module.exports = { createAccessLog };
