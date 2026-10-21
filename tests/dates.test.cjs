'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const { normalizeDate, normalizeJobs } = require('../crawler/publish');
const site = { key: 'a', company: 'Alpha', ats: 'moka', orgId: 'official', siteId: 123, site: 'campus', batch: '指定批次' };
const { reliableDate, datesOf } = require('../assets/rank.js')({});

test('official times become Beijing calendar days; unknown writings are no date, never the crawl clock', () => {
  a.equal(normalizeDate(Date.UTC(2026, 9, 8, 17, 0, 0)), '2026-10-09', 'epoch ms: 17:00 UTC is already the next day in Beijing');
  a.equal(normalizeDate(String(Date.UTC(2026, 9, 8, 15, 59, 59))), '2026-10-08');
  a.equal(normalizeDate('2026-08-13T20:00:00Z'), '2026-08-14');
  a.equal(normalizeDate('2026-08-13T07:50:34.000+00:00'), '2026-08-13');
  a.equal(normalizeDate('2026-09-20 21:38:46'), '2026-09-20', 'no zone = the official site\'s own (Beijing) time');
  a.equal(normalizeDate('2026年10月08日'), '2026-10-08');
  a.equal(normalizeDate('-1'), null); a.equal(normalizeDate('昨天'), null);
  a.throws(() => normalizeDate('2026-02-30'));
});

test('jobs carry publishedAt / updatedAt; an unreadable time is dropped without failing the source', () => {
  const ms = Date.UTC(2026, 9, 8, 17, 0, 0);
  const [job] = normalizeJobs([{ id: '1', title: '岗位', channels: ['social'], publishedAt: '2026-10-01', updatedAt: ms, jdComplete: true, duty: '正文' }], site);
  a.deepEqual([job.publishedAt, job.updatedAt, 'date' in job, 'dateKind' in job], ['2026-10-01', '2026-10-09', false, false]);
  const [bad] = normalizeJobs([{ id: '2', title: '岗位', publishedAt: '2026-02-30', updatedAt: '前天' }], site);
  a.deepEqual([bad.publishedAt, bad.updatedAt], [undefined, undefined]);
});

test('ranking uses the newer of the two days', () => {
  a.equal(reliableDate({ publishedAt: '2026-10-01', updatedAt: '2026-10-09' }), '2026-10-09');
  a.equal(reliableDate({ publishedAt: '2026-10-05' }), '2026-10-05');
  a.equal(reliableDate({ publishedAt: '2026-02-30' }), '');
  a.deepEqual(datesOf({ publishedAt: '2026-10-01', updatedAt: 'x' }), { published: '2026-10-01', updated: '' });
});
