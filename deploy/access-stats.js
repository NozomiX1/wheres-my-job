#!/usr/bin/env node
'use strict';
// 看访问情况：node deploy/access-stats.js [日志文件] [--days N] [--ips]
// 日志由搜索服务写（环境变量 ANDE_ACCESS_LOG 指定文件，格式见 server/access.js）。机器人（UA 像爬虫）不计；
// ANDE_EXCLUDE_IPS=ip1,ip2 可排除自己的 IP。日期按北京时间。独立 IP / 独立浏览器都只是近似的“人数”，见 README。
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function summarize(text, { days = 7, exclude = [], now = Date.now() } = {}) {
  const byDay = new Map(), ips = new Map(), cutoff = now - days * 864e5;
  for (const line of text.split('\n')) {
    const [time, event, ip, visitor, bot] = line.split('\t');
    const t = Date.parse(time);
    if (!event || Number.isNaN(t) || t < cutoff || bot === '1' || exclude.includes(ip)) continue;
    const day = new Date(t + 8 * 36e5).toISOString().slice(0, 10);
    const d = byDay.get(day) || { page: 0, search: 0, job: 0, ips: new Set(), visitors: new Set() };
    byDay.set(day, d);
    d[event] = (d[event] || 0) + 1;
    d.ips.add(ip); if (visitor) d.visitors.add(visitor);
    ips.set(ip, (ips.get(ip) || 0) + 1);
  }
  return { rows: [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({ day, page: d.page, search: d.search, job: d.job, ips: d.ips.size, visitors: d.visitors.size })), ips: [...ips].sort((a, b) => b[1] - a[1]) };
}

if (require.main === module) {
  const args = process.argv.slice(2), flag = name => args.includes(name);
  const daysAt = args.indexOf('--days'), days = daysAt >= 0 ? Number(args[daysAt + 1]) || 7 : 7;
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--days') || process.env.ANDE_ACCESS_LOG || path.join(os.homedir(), 'ande-access.log');
  const { rows, ips } = summarize(fs.readFileSync(file, 'utf8'), { days, exclude: (process.env.ANDE_EXCLUDE_IPS || '').split(',').filter(Boolean) });
  // 经 xray 回落进来的访客来源都是本机回环（拿不到真实 IP）：此时 IP 没有意义，只看独立浏览器。
  const realIps = ips.some(([ip]) => !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip));
  console.log(`近 ${days} 天（北京时间，不含机器人）`);
  console.log(realIps ? '日期        页面访问  搜索  看详情  独立IP  独立浏览器' : '日期        页面访问  搜索  看详情  独立浏览器');
  for (const r of rows) console.log(`${r.day}  ${String(r.page).padStart(8)}  ${String(r.search).padStart(4)}  ${String(r.job).padStart(6)}  ${realIps ? String(r.ips).padStart(6) + '  ' : ''}${String(r.visitors).padStart(10)}`);
  if (!realIps) console.log('\n（日志里的 IP 都是 127.0.0.1：代理没有传访客的真实 IP，所以不统计 IP，人数以独立浏览器为准。）');
  else if (flag('--ips')) { console.log('\nIP（请求数）'); for (const [ip, n] of ips.slice(0, 50)) console.log(`${ip}  ${n}`); }
}

module.exports = { summarize };
