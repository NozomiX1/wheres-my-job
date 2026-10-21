'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const { recruitKind, jobFacts } = require('../assets/facts.js');

test('kind: official nature and channel first, then title evidence, JD only when the channel is unknown', () => {
  a.equal(recruitKind({ title: '后端', channels: ['campus'], employment: 'internship' }), 'intern');
  a.equal(recruitKind({ title: '算法实习生', channels: ['social'], employment: 'full-time' }), 'intern', '实习 in the title beats the official 全职 and the channel');
  a.equal(recruitKind({ title: 'ML Research Intern', channels: ['social'] }), 'intern');
  a.equal(recruitKind({ title: 'Internal Auditor', channels: ['social'] }), 'social', 'Internal / International are not Intern');
  a.equal(recruitKind({ title: '研究员（实习/全职）', channels: ['social'] }), 'social', 'a title naming several kinds is not decided by the title');
  a.equal(recruitKind({ title: '【校招/实习】算法', channels: ['social'] }), 'social');
  a.equal(recruitKind({ title: '27届校招GLM算法工程师', channels: ['social'] }), 'campus', '「XX届」in the title is campus evidence even in a social channel');
  a.equal(recruitKind({ title: '算法', channels: ['social'], requirements: '优秀应届生亦可，2027届' }), 'social', 'JD never overrides a known channel');
  a.equal(recruitKind({ title: '算法', channels: [], requirements: '2027届本科及以上' }), 'campus');
  a.equal(recruitKind({ title: '算法', channels: [], requirements: '3年以上算法经验' }), 'social');
  a.equal(recruitKind({ title: '算法', channels: [], requirements: '热爱编程' }), null);
  a.equal(recruitKind({ title: '算法', channels: ['campus', 'social'] }), null);
});

test('facts: only what the JD states clearly; conflicting or soft statements show nothing', () => {
  const social = requirements => jobFacts({ title: '后端', channels: ['social'], requirements });
  a.deepEqual(social('1、本科及以上学历，3年以上后端经验'), ['3年以上', '本科及以上']);
  a.deepEqual(social('3年以上A经验；5年以上B经验；2年以上C'), ['5年以上'], 'several minimums: the strictest');
  a.deepEqual(social('3-5年相关工作经验'), ['3-5年']);
  a.deepEqual(social('5年以上完整CG项目管理和制片工作经验，或3年以上游戏行业视频业务相关制片经验'), ['3年以上'], 'two experiences joined by 或 are alternatives: the lower one');
  a.deepEqual(social('3年以上开发经验，或 2 年以上 AI 工程化落地经验'), ['2年以上']);
  a.deepEqual(social('即时零售行业10年以上或零售行业10年以上经验'), ['10年以上']);
  a.deepEqual(social('5年以上产品或产品运营经验，2年以上团队管理经验'), ['5年以上'], '「或」inside one item does not make the next item an alternative');
  a.deepEqual(social('3年以上A经验，或2年以上B经验；5年以上C经验'), ['5年以上'], 'alternatives form a group; separate requirements still take the strictest');
  a.deepEqual(social('5+ years of experience'), ['5年以上']);
  a.deepEqual(social('近3年内有项目经验；1年以上运营经验优先'), [], 'recent-years phrases and 优先 are not requirements');
  a.deepEqual(social('经验不限'), ['经验不限']);
  a.deepEqual(social('硕士学位及以上；博士优先'), ['硕士及以上']);
  a.deepEqual(social('本科及以上学历，硕士优先'), ['本科及以上']);
  a.deepEqual(social('专业：本科、硕士均可'), [], 'a bare degree word is not a requirement');
  const intern = requirements => jobFacts({ title: '算法实习生', channels: [], requirements });
  a.deepEqual(intern('2026-2027届硕士及以上学历在读，实习期不短于4个月；日常实习为期3个月及以上'), ['26-27届', '硕士及以上', '至少4个月']);
  a.deepEqual(jobFacts({ title: '27届算法', channels: ['campus'], requirements: '3年以上经验' }), ['27届'], 'experience is only shown for social jobs');
});

test('structured experience / degree fields from the official list come first; unknown spellings give nothing', () => {
  const { structuredExperience: exp, structuredDegree: deg } = require('../assets/facts.js');
  a.deepEqual(['不限', '3-5年', '0-3年', '三年以上工作经验', '十年以上工作经验', '5年以上', '应届', ''].map(exp), ['经验不限', '3-5年', '0-3年', '3年以上', '10年以上', '5年以上', '', '']);
  a.deepEqual(['本科', 'bachelor', '硕士研究生', 'MASTER-AND-ABOVE', 'UNDERGRADUATE-AND-ABOVE', 'BACHELOR_ABOVE', '大专', '博士', '不限', 'xx'].map(deg), ['本科及以上', '本科及以上', '硕士及以上', '硕士及以上', '本科及以上', '本科及以上', '大专及以上', '博士', '学历不限', '']);
  const job = { title: '后端', channels: ['social'], experience: '3-5年', education: '硕士及以上', requirements: '本科及以上，1年以上经验' };
  a.deepEqual(jobFacts(job), ['3-5年', '硕士及以上'], 'the structured value wins over the JD text');
  a.deepEqual(jobFacts({ ...job, experience: undefined, education: undefined }), ['1年以上', '本科及以上'], 'no structured value: fall back to the JD');
});

test('batch / project names give the graduation year, with or without the 届 character', () => {
  const cohort = batch => jobFacts({ title: '算法', channels: ['campus'], batch }).find(x => /届/.test(x));
  a.equal(cohort('2027届蚂蚁星- Plan A人才计划'), '27届'); a.equal(cohort('2027 校园招聘'), '27届'); a.equal(cohort('27届校园招聘'), '27届');
  a.equal(cohort('2027届及之后毕业的在校生'), '27届'); a.equal(cohort('日常实习'), undefined);
});
