'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const { departmentField } = require('../crawler/lib/optional-fields');
const { normalizeJobs } = require('../crawler/publish');
const site = { key: 'a', company: 'Alpha', ats: 'moka', orgId: 'official', siteId: 123, site: 'campus', batch: '指定批次' };

test('department: a string or a list of strings becomes one display name; anything else is no department', () => {
  a.deepEqual(departmentField(' IEG '), { department: 'IEG' });
  a.deepEqual(departmentField(['雷火事业群', '艺设三部']), { department: '雷火事业群/艺设三部' });
  for (const none of [undefined, null, '', '  ', [], [1, null], 5, {}]) a.deepEqual(departmentField(none), {});
});

test('the publisher keeps a department (trimmed, capped) and omits the key when there is none', () => {
  const [withDept, without] = normalizeJobs([{ id: '1', title: '岗位', department: '  技术中心  ' }, { id: '2', title: '岗位', department: '  ' }], site);
  a.equal(withDept.department, '技术中心'); a.ok(!('department' in without));
  a.equal(normalizeJobs([{ id: '3', title: '岗位', department: '很长'.repeat(30) }], site)[0].department.length, 40);
});

test('department: Meituan lists departments as [{name, children}]; only the first name is shown', () => {
  a.deepEqual(departmentField([{ code: null, name: '食杂零售-小象事业部', children: [{ name: '配送' }] }, { name: '其他' }]), { department: '食杂零售-小象事业部' });
  a.deepEqual(departmentField([{ name: ' ' }]), {}); a.deepEqual(departmentField([{}]), {});
});

test('optional display fields: only non-empty strings and numbers survive; ant/ali {from,to} years become a label', () => {
  const { optionalFields, yearsRange } = require('../crawler/lib/optional-fields');
  a.deepEqual(optionalFields({ experience: ' 3-5年 ', education: '', batch: undefined, x: null, n: 5, o: {} }), { experience: '3-5年', n: 5 });
  a.equal(yearsRange({ from: 3, to: null }), '3年以上'); a.equal(yearsRange({ from: 3, to: 5 }), '3-5年'); a.equal(yearsRange({ from: 0 }), undefined); a.equal(yearsRange(null), undefined);
});

test('the publisher carries structured experience / education (normalized) and batch, and drops what it cannot read', () => {
  const [job, bad] = normalizeJobs([{ id: '1', title: '岗位', experience: '三年以上工作经验', education: 'MASTER-AND-ABOVE', batch: ' 2027届秋招 ' }, { id: '2', title: '岗位', experience: '随意', education: '随意', batch: '  ' }], site);
  a.deepEqual([job.experience, job.education, job.batch], ['3年以上', '硕士及以上', '2027届秋招']);
  for (const f of ['experience', 'education', 'batch']) a.ok(!(f in bad), f);
});
