'use strict';
// 自研门户适配器的唯一登记表：crawl.js / publish.js 只遍历这里。新增门户只需在此加一项。
// 适配器模块必须导出 requiresVerification / verifiedSource / portalNotice / validateJobs / validateEvidence / normalizeRecord。
const path = require('node:path');
const DIR = path.join(__dirname, 'custom');
const load = name => require('./custom/' + name);
const feishu = require('./feishu'), beisen = require('./beisen');
const ali = load('ali_social_common');

// 字段：
//   script/timeout     采集子进程；qualifies 通过身份与范围核验才运行
//   rawTitle/directJD  规范化时标题不 trim / 正文直接取适配器字段
//   noticePass/adapter 全局通知：1=按来源分组先出，2=按站点逐个出；noticeMode 决定匹配 coverage 的方式
const entry = (mod, label, timeout, extra = {}) => ({ mod, unverified: label + ' has not been verified', timeout, rawTitle: () => false, directJD: () => true, noticeMode: 'includes', ...extra });
const custom = (file, label, timeout, extra) => entry(load(file), label, timeout, { script: () => path.join(DIR, file + '.js'), ...extra });

// 脚本名由 site.adapter 推出的一批门户。
const BY_ADAPTER = ['huawei', 'xiaohongshu', 'baidu', 'alibaba', 'baichuan', 'bilibili', 'ant', 'kuaishou', 'tencent', 'tme', 'jd', 'oppo', 'leihuo', 'netease', 'vivo_social']
  .map(name => entry(load(name + '_portal'), 'Portal identity/scope', 900000, { rawTitle: () => true, noticeMode: 'exact', noticePass: 2,
    script: site => path.join(DIR, site.adapter.replace('-portal-v1', '_portal.js').replaceAll('-', '_')) }));

const OTHERS = [
  custom('ali_social_common', 'Ali social portal identity/scope/mode', 900000, {
    qualifies: site => ali.verifiedSource(site) || ali.availableSource(site), rawTitle: site => ali.availableSource(site), directJD: site => ali.availableSource(site),
    noticePass: 1, rank: 1, adapter: 'ali-social-portal-v1', groupNotice: ali.PORTAL_NOTICE }),
  // meituan 的 requiresVerification 也覆盖校园站点，所以 meituanCampus 必须排在 meituan 之前。
  custom('meituan_campus_portal', 'Meituan campus identity/scope/mode', 900000, { noticePass: 1, rank: 3, noticeMode: 'exact' }),
  custom('meituan_portal', 'Meituan portal identity/scope/mode', 2400000, { passOptions: true, noticePass: 1, rank: 2, adapter: 'meituan-portal-v1' }),
  custom('ctrip_portal', 'Ctrip portal identity/scope/mode', 900000, { noticePass: 2, adapter: 'ctrip-portal-v1' }),
  custom('mihoyo_portal', 'Mihoyo portal identity/scope/mode', 2400000, { noticePass: 2, adapter: 'mihoyo-portal-v1' }),
  custom('shlab_portal', 'SHLAB portal identity/scope/mode', 900000, { noticePass: 2, adapter: 'shlab-portal-v1' }),
  custom('xiaomi_portal', 'Xiaomi portal identity/scope/mode', 2400000, { rawTitle: () => true, noticePass: 2, adapter: 'xiaomi-hr-v1' }),
  // 飞书与北森的模块在 lib/ 下，不在 custom/。
  entry(feishu, 'Feishu source', 1200000, { script: () => path.join(__dirname, 'feishu.js'), directJD: () => false, noticeMode: 'exact', noticePass: 2 }),
  entry(beisen, 'Beisen portal identity/scope/mode', 900000, { script: () => path.join(__dirname, 'beisen.js'), directJD: () => false, noticePass: 1, rank: 4, adapter: 'beisen-portal-v1', groupNotice: beisen.PORTAL_NOTICE })
];

const portals = [...BY_ADAPTER, ...OTHERS].map(p => ({ qualifies: site => p.mod.verifiedSource(site), ...p }));

// 旧门户（OPPO、腾讯等）列表中途出错时会带着已得结果返回，并在证据里留 stopped 记录；列表（而不是详情）出错或触顶就不能上架。
function listStopped(envelope, site) {
  const stopped = envelope?.verification?.stopped, issues = envelope?.verification?.issues ?? envelope?.issues ?? [];
  if (stopped && typeof stopped === 'object') {
    if (stopped.stage) return stopped.stage === 'page';
    const pathOf = url => { try { return new URL(String(url)).pathname; } catch { return null; } };
    const requested = pathOf(stopped.request?.url);
    return requested === null || requested === pathOf(site.api); // 取不到请求地址时按列表出错处理（不上架更安全）
  }
  return issues.some(issue => /请求停止/.test(issue) && !/详情/.test(issue) || /达到.*(上限|时限)/.test(issue));
}

module.exports = {
  portals, listStopped,
  // 声明要处理该站点（无论是否已核验）的门户
  requiring: site => portals.find(p => p.mod.requiresVerification(site)),
  // 身份与范围已核验、可以运行/发布的门户
  qualified: site => portals.find(p => p.qualifies(site)),
  // 注册表中所有门户的 portalNotice 拼接（至多一个非空）
  notices: site => portals.map(p => p.mod.portalNotice(site)).filter(Boolean)
};
