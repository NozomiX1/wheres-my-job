'use strict';
// 自研门户适配器的唯一登记表：crawl.js / publish.js 只遍历这里。新增门户只需在此加一项。
// 适配器模块必须导出 requiresVerification / verifiedSource / portalNotice / validateJobs / validateEvidence / normalizeRecord。
const path = require('node:path');
const DIR = path.join(__dirname, 'custom');
const load = name => require('./custom/' + name);
const ali = load('ali_social_common'), meituan = load('meituan_portal'), meituanCampus = load('meituan_campus_portal');

// 只发布"可用但未验证完整"的门户：快照必须 complete:false，脚本名由 site.adapter 推出。
const AVAILABLE = ['huawei', 'xiaohongshu', 'baidu', 'alibaba', 'baichuan', 'bilibili', 'ant', 'kuaishou', 'tencent', 'tme', 'jd', 'oppo', 'leihuo', 'netease', 'vivo_social']
  .map(name => {
    const mod = load(name + '_portal');
    return { mod, unverified: 'Portal identity/scope has not been verified', timeout: 900000, availableOnly: () => true, rawTitle: () => true, directJD: () => true, noticeMode: 'exact',
      script: site => path.join(DIR, site.adapter.replace('-portal-v1', '_portal.js').replaceAll('-', '_')) };
  });

// 其余门户。字段：
//   script/timeout     采集子进程；qualifies 通过身份与范围核验才运行
//   availableOnly      只能发布 complete:false 的可用快照；allowAvailable 也允许可用快照（但不强制）
//   rawTitle/directJD  规范化时标题不 trim / 正文直接取适配器字段
//   noticePass/adapter 全局通知：1=按来源分组先出，2=按站点逐个出；noticeMode 决定匹配 coverage 的方式
const named = (file, label, timeout, extra = {}) => ({ mod: load(file), unverified: label + ' has not been verified', timeout, script: () => path.join(DIR, file + '.js'),
  availableOnly: () => false, rawTitle: () => false, directJD: () => true, noticeMode: 'includes', ...extra });

const OTHERS = [
  named('ali_social_common', 'Ali social portal identity/scope/mode', 900000, {
    qualifies: site => ali.verifiedSource(site) || ali.availableSource(site), availableOnly: site => ali.availableSource(site), allowAvailable: true,
    rawTitle: site => ali.availableSource(site), directJD: site => ali.availableSource(site),
    noticePass: 1, rank: 1, adapter: 'ali-social-portal-v1', groupNotice: ali.PORTAL_NOTICE }),
  // meituan 的 requiresVerification 也覆盖校园站点，所以 meituanCampus 必须排在 meituan 之前。
  named('meituan_campus_portal', 'Meituan campus identity/scope/mode', 900000, { noticePass: 1, rank: 3, noticeMode: 'exact' }),
  named('meituan_portal', 'Meituan portal identity/scope/mode', 2400000, { allowAvailable: true, passOptions: true, noticePass: 1, rank: 2, adapter: 'meituan-portal-v1' }),
  named('ctrip_portal', 'Ctrip portal identity/scope/mode', 900000, { allowAvailable: true, noticePass: 2, adapter: 'ctrip-portal-v1' }),
  named('mihoyo_portal', 'Mihoyo portal identity/scope/mode', 2400000, { allowAvailable: true, noticePass: 2, adapter: 'mihoyo-portal-v1' }),
  named('shlab_portal', 'SHLAB portal identity/scope/mode', 900000, { allowAvailable: true, noticePass: 2, adapter: 'shlab-portal-v1' }),
  named('xiaomi_portal', 'Xiaomi portal identity/scope/mode', 2400000, { allowAvailable: true, rawTitle: () => true, noticePass: 2, adapter: 'xiaomi-hr-v1' })
];

const portals = [...AVAILABLE.map(p => ({ noticePass: 2, ...p })), ...OTHERS].map(p => ({
  qualifies: site => p.mod.verifiedSource(site), allowAvailable: false, ...p,
  // 允许发布可用快照：专属可用门户，或显式声明
  canBeAvailable: site => p.availableOnly(site) || p.allowAvailable === true
}));

module.exports = {
  portals,
  // 声明要处理该站点（无论是否已核验）的门户
  requiring: site => portals.find(p => p.mod.requiresVerification(site)),
  // 身份与范围已核验、可以运行/发布的门户
  qualified: site => portals.find(p => p.qualifies(site)),
  // 注册表中所有门户的 portalNotice 拼接（至多一个非空）
  notices: site => portals.map(p => p.mod.portalNotice(site)).filter(Boolean)
};
