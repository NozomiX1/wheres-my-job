'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { htmlText } = require('../crawler/lib/jd-text');
const workday = require('../crawler/lib/custom/tencent_workday');

const officialUrl = 'https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/SKorea-Seoul/Tencent-Cloud---Technical-Account-Manager--Korea-_R108129';
function request() {
  return {
    url: 'https://tencent.wd1.myworkdayjobs.com/wday/cxs/tencent/Tencent_Careers/job/SKorea-Seoul/Tencent-Cloud---Technical-Account-Manager--Korea-_R108129',
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept-Language': 'zh-CN',
      Referer: 'https://tencent.wd1.myworkdayjobs.com/zh-CN/Tencent_Careers/job/SKorea-Seoul/Tencent-Cloud---Technical-Account-Manager--Korea-_R108129'
    },
    body: null
  };
}
function evidence() {
  return {
    request: request(),
    httpStatus: 200,
    response: {
      jobPostingInfo: {
        id: 'ffd82d1585321000a63e6b0e2c2a0000',
        title: 'Tencent Cloud - Technical Associate Account Representative (Korea)',
        jobDescription: '<h1>Business Unit</h1><p>Cloud &amp; Smart Industries</p>',
        jobReqId: 'R108129',
        jobPostingId: 'Tencent-Cloud---Technical-Account-Manager--Korea-_R108129',
        jobPostingSiteId: 'Tencent_Careers',
        externalUrl: officialUrl,
        startDate: '2026-09-15',
        postedOn: '发布于 23 天前',
        timeType: 'Full time'
      },
      userAuthenticated: false
    },
    completedAt: '2026-10-08T11:39:15.916Z'
  };
}

test('Tencent official Workday link yields only the observed anonymous GET contract', () => {
  assert.deepEqual(workday.requestFor(officialUrl), request());
});

test('bound HTTP200 anonymous detail keeps the native title, GUID, metadata and empty body', () => {
  const raw = evidence();
  assert.strictEqual(workday.validateDetail(raw, officialUrl), raw.response.jobPostingInfo);
  raw.response.jobPostingInfo.jobDescription = '';
  assert.strictEqual(workday.validateDetail(raw, officialUrl), raw.response.jobPostingInfo);
  raw.response.jobPostingInfo.id = 'FFD82D1585321000A63E6B0E2C2A0000';
  assert.equal(workday.validateDetail(raw, officialUrl).id, 'FFD82D1585321000A63E6B0E2C2A0000');
});

test('HTML renderer converts a single full body once, without splitting or summarizing headings', () => {
  const raw = evidence(), tail = '保留最后完整一段'.repeat(120);
  raw.response.jobPostingInfo.jobDescription = '<h1>Business Unit</h1><p>Cloud &amp; Smart &lt;T&gt; &amp;lt;literal&amp;gt; &#x1F680;</p>' +
    '<h2>岗位职责</h2><p>同文 &#39;quote&#39;</p><h2>岗位要求</h2><p>同文 &#39;quote&#39;</p>' +
    '<p>Equal Employment &copy; 2026</p><p>' + tail + '</p>';
  assert.equal(workday.description(raw, officialUrl), "Business Unit\nCloud & Smart <T> &lt;literal&gt; 🚀\n岗位职责\n同文 'quote'\n岗位要求\n同文 'quote'\nEqual Employment © 2026\n" + tail);
  raw.response.jobPostingInfo.jobDescription = '';
  assert.equal(workday.description(raw, officialUrl), '');
  raw.response.jobPostingInfo.jobDescription = '—';
  assert.equal(workday.description(raw, officialUrl), '—');
});

test('observed suffixes and locationless paths retain their exact slug; reqId excludes the duplicate suffix', () => {
  const url = 'https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/-Senior-Animator_R108155-1';
  const expected = {
    ...request(),
    url: 'https://tencent.wd1.myworkdayjobs.com/wday/cxs/tencent/Tencent_Careers/job/-Senior-Animator_R108155-1',
    headers: { ...request().headers, Referer: 'https://tencent.wd1.myworkdayjobs.com/zh-CN/Tencent_Careers/job/-Senior-Animator_R108155-1' }
  };
  assert.deepEqual(workday.requestFor(url), expected);
  const raw = evidence();
  raw.request = expected;
  Object.assign(raw.response.jobPostingInfo, { externalUrl: url, jobReqId: 'R108155', jobPostingId: '-Senior-Animator_R108155-1' });
  assert.strictEqual(workday.validateDetail(raw, url), raw.response.jobPostingInfo);
  raw.response.jobPostingInfo.jobReqId = 'R108155-1';
  assert.throws(() => workday.validateDetail(raw, url), /jobReqId/);
  const withLocation = 'https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/Singapore-CapitaSky/Video-Generation-Foundation-Model-Researcher_R107810-1';
  assert.equal(workday.requestFor(withLocation).url, 'https://tencent.wd1.myworkdayjobs.com/wday/cxs/tencent/Tencent_Careers/job/Singapore-CapitaSky/Video-Generation-Foundation-Model-Researcher_R107810-1');
});

test('observed official slug may have no title prefix before _R, without inventing or rewriting one', () => {
  const url = 'https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/China-Shenzhen/_R108057-2';
  const expected = {
    ...request(),
    url: 'https://tencent.wd1.myworkdayjobs.com/wday/cxs/tencent/Tencent_Careers/job/China-Shenzhen/_R108057-2',
    headers: { ...request().headers, Referer: 'https://tencent.wd1.myworkdayjobs.com/zh-CN/Tencent_Careers/job/China-Shenzhen/_R108057-2' }
  };
  assert.deepEqual(workday.requestFor(url), expected);
  const raw = evidence(); raw.request = expected;
  Object.assign(raw.response.jobPostingInfo, { externalUrl: url, jobReqId: 'R108057', jobPostingId: '_R108057-2' });
  assert.strictEqual(workday.validateDetail(raw, url), raw.response.jobPostingInfo);
});

test('only normal original HTTPS Tencent tenant/site job URLs are accepted, never guessed IDs', () => {
  const badUrls = [null, undefined, 2099443063863820300, '', officialUrl + '\n', ' ' + officialUrl,
    officialUrl.replace('https:', 'http:'), officialUrl.replace('tencent.wd1', 'other.wd1'),
    officialUrl.replace('wd1', 'wd2'), officialUrl.replace('.com/', '.com.evil.example/'),
    officialUrl.replace('https://', 'https://user:password@'), officialUrl.replace('.com/', '.com:443/'),
    officialUrl.replace('/Tencent_Careers/', '/Other_Careers/'), officialUrl.replace('/Tencent_Careers/', '/zh-CN/Tencent_Careers/'),
    officialUrl + '?lang=zh-CN', officialUrl + '?', officialUrl + '#fragment', officialUrl + '#', officialUrl + '/apply',
    officialUrl.replace('/SKorea-Seoul/', '/China-Shenzhen/../SKorea-Seoul/'),
    officialUrl.replace('/SKorea-Seoul/', '/%2e%2e/'), officialUrl.replace('/SKorea-Seoul/', '/SKorea%2fSeoul/'),
    officialUrl.replace('_R108129', '_108129'), officialUrl.replace('_R108129', '_R-2'), officialUrl.replace('_R108129', '_R1-two'),
    'https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/1282707398326592512',
    'https://tencent.wd1.myworkdayjobs.com/wday/cxs/other/Tencent_Careers/job/Original_R1'];
  for (const url of badUrls) {
    assert.throws(() => workday.requestFor(url), /official URL/, String(url));
    assert.throws(() => workday.validateDetail(evidence(), url), /official URL/, String(url));
    assert.throws(() => workday.description(evidence(), url), /official URL/, String(url));
  }
});

test('detail binding rejects HTTP failures, wrong URL/tenant, method, any changed header and any body', () => {
  const mutations = [
    raw => raw.httpStatus = 403,
    raw => raw.httpStatus = '200',
    raw => delete raw.httpStatus,
    raw => delete raw.request,
    raw => raw.request.url = raw.request.url.replace('/cxs/tencent/', '/cxs/other/'),
    raw => raw.request.url = raw.request.url.replace('/SKorea-Seoul/', '/Other-City/'),
    raw => raw.request.url += '?signature=fake',
    raw => raw.request.method = 'POST',
    raw => raw.request.headers.Accept = 'text/plain',
    raw => raw.request.headers['Content-Type'] = 'application/json',
    raw => raw.request.headers['Accept-Language'] = 'en-US',
    raw => raw.request.headers.Referer = officialUrl,
    raw => delete raw.request.headers.Accept,
    raw => raw.request.headers.Cookie = 'invented',
    raw => raw.request.headers['User-Agent'] = 'invented',
    raw => raw.request.headers.Signature = 'invented',
    raw => raw.request.body = '',
    raw => raw.request.body = {},
    raw => delete raw.request.body
  ];
  for (const [index, mutate] of mutations.entries()) {
    const raw = evidence(); mutate(raw);
    assert.throws(() => workday.validateDetail(raw, officialUrl), /Tencent Workday:/, 'mutation ' + index);
    assert.throws(() => workday.description(raw, officialUrl), /Tencent Workday:/, 'mutation ' + index);
  }
});

test('HTTP200 plus matching reqId is insufficient: full posting/site/URL/GUID and explicit anonymity bind', () => {
  const infoPatches = [
    { jobReqId: 'R1' }, { jobReqId: 108129 }, { jobPostingId: 'Other-Title_R108129' },
    { jobPostingId: 'Tencent-Cloud---Technical-Account-Manager--Korea-_R108129-1' },
    { jobPostingSiteId: 'Other_Careers' }, { jobPostingSiteId: null },
    { externalUrl: officialUrl.replace('/SKorea-Seoul/', '/China-Shenzhen/') },
    { externalUrl: officialUrl.replace('tencent.wd1', 'other.wd1') },
    { externalUrl: officialUrl.replace('/Tencent_Careers/', '/zh-CN/Tencent_Careers/') },
    { externalUrl: officialUrl + '?lang=zh-CN' }, { externalUrl: null },
    { id: 'ffd82d15-8532-1000-a63e-6b0e2c2a0000' }, { id: 'x'.repeat(32) },
    { id: 'ffd82d1585321000a63e6b0e2c2a0000\n' }, { id: 'f'.repeat(31) },
    { id: 2099443063863820300 }, { id: null }, { id: '' }
  ];
  for (const patch of infoPatches) {
    const raw = evidence(); Object.assign(raw.response.jobPostingInfo, patch);
    assert.throws(() => workday.validateDetail(raw, officialUrl), /binding|GUID/, JSON.stringify(patch));
    assert.throws(() => workday.description(raw, officialUrl), /binding|GUID/, JSON.stringify(patch));
  }
  for (const authenticated of [true, null, 0, 'false', undefined]) {
    const raw = evidence(); raw.response.userAuthenticated = authenticated;
    assert.throws(() => workday.validateDetail(raw, officialUrl), /anonymous/);
  }
  const raw = evidence(); delete raw.response.userAuthenticated;
  assert.throws(() => workday.validateDetail(raw, officialUrl), /anonymous/);
});

test('native required fields are own and correctly typed; fake text cannot replace jobDescription', () => {
  for (const field of ['jobDescription', 'title', 'id', 'jobReqId', 'jobPostingId', 'jobPostingSiteId', 'externalUrl']) {
    const raw = evidence();
    const info = raw.response.jobPostingInfo, value = info[field]; delete info[field];
    assert.throws(() => workday.validateDetail(raw, officialUrl), /fields/, field);
    Object.setPrototypeOf(info, { [field]: value });
    assert.throws(() => workday.validateDetail(raw, officialUrl), /fields/, 'inherited ' + field);
  }
  for (const body of [null, undefined, 1, {}, [], new String('fake')]) {
    const raw = evidence(); raw.response.jobPostingInfo.jobDescription = body;
    raw.response.jobPostingInfo.text = 'plausible but unproven JD';
    assert.throws(() => workday.description(raw, officialUrl), /jobDescription/);
  }
  for (const title of ['', ' \t\n ', null, 1]) {
    const raw = evidence(); raw.response.jobPostingInfo.title = title;
    assert.throws(() => workday.validateDetail(raw, officialUrl), /title/);
  }
  for (const value of [null, [], 'fake', undefined]) {
    const raw = evidence(); raw.response.jobPostingInfo = value;
    assert.throws(() => workday.validateDetail(raw, officialUrl), /jobPostingInfo/);
  }
  for (const value of [null, [], 'fake', undefined]) {
    const raw = evidence(); raw.response = value;
    assert.throws(() => workday.validateDetail(raw, officialUrl), /response/);
  }
  for (const value of [null, [], 'fake', undefined]) assert.throws(() => workday.validateDetail(value, officialUrl), /request binding/);
});

test('unexplained nonempty body fields including renderer videoInfo reject, not unrelated metadata', () => {
  for (const [scope, field, value] of [
    ['jobPostingInfo', 'extraJD', 'unobserved body'],
    ['jobPostingInfo', 'jobDescriptionExtra', 'unobserved body'],
    ['jobPostingInfo', 'requirements', 'unobserved body'],
    ['jobPostingInfo', 'text', 'fake text'],
    ['jobPostingInfo', 'videoInfo', { title: 'unverified video', params: {} }],
    ['response', 'extraJD', 'unobserved body'],
    ['response', 'jobDescription', 'unobserved second body']
  ]) {
    const raw = evidence(), target = scope === 'response' ? raw.response : raw.response.jobPostingInfo;
    target[field] = value;
    assert.throws(() => workday.validateDetail(raw, officialUrl), /unknown extra JD field: /, scope + '.' + field);
    assert.throws(() => workday.description(raw, officialUrl), /unknown extra JD field: /, scope + '.' + field);
  }
  const raw = evidence();
  Object.assign(raw.response.jobPostingInfo, {
    extraJD: null, jobDescriptionExtra: '', location: 'S.Korea-Seoul',
    country: { descriptor: '大韩民国', id: '7a5a2aadf9d34086a2bfbfd408bc28da' },
    questionnaireId: '996e5ca7e8851001972d00c938eb0000',
    optionalMetadata: { updatedAt: 'not a proven sorting date', employment: 'not a proven property' }
  });
  Object.assign(raw.response, { hiringOrganization: { name: 'Native organization', url: '' }, similarJobs: [], optionalMetadata: 2099443063863820300 });
  assert.strictEqual(workday.validateDetail(raw, officialUrl), raw.response.jobPostingInfo);
  assert.equal(workday.description(raw, officialUrl), 'Business Unit\nCloud & Smart Industries');
});

test('read-only helpers neither alter frozen original records nor add canonical/source/date/JD fields', () => {
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  const record = { post: { postId: '1282707398326592512', id: 2099443063863820300, positionUrl: officialUrl }, workdayDetail: evidence() };
  const before = structuredClone(record); freeze(record);
  assert.strictEqual(workday.validateDetail(record.workdayDetail, record.post.positionUrl), record.workdayDetail.response.jobPostingInfo);
  assert.equal(workday.description(record.workdayDetail, record.post.positionUrl), 'Business Unit\nCloud & Smart Industries');
  const req = workday.requestFor(record.post.positionUrl); req.headers.Accept = 'mutated by caller';
  assert.deepEqual(workday.requestFor(record.post.positionUrl), request());
  assert.deepEqual(record, before);
  const info = record.workdayDetail.response.jobPostingInfo;
  for (const field of ['sourceKey', 'company', 'duty', 'requirements', 'description', 'date', 'dateKind', 'employment', 'jdComplete']) assert.equal(Object.hasOwn(info, field), false, field);
});

function canonicalEvidence() {
  const raw = evidence();
  const url = officialUrl.replace('/SKorea-Seoul/', '/South-Korea-Seoul/');
  raw.response.jobPostingInfo.externalUrl = url;
  raw.canonical = {
    url,
    listing: {
      request: {
        url: 'https://tencent.wd1.myworkdayjobs.com/wday/cxs/tencent/Tencent_Careers/jobs',
        method: 'POST',
        headers: {
          Accept: 'application/json', 'Content-Type': 'application/json', 'Accept-Language': 'zh-CN',
          Referer: 'https://tencent.wd1.myworkdayjobs.com/zh-CN/Tencent_Careers',
          Origin: 'https://tencent.wd1.myworkdayjobs.com'
        },
        body: { appliedFacets: {}, limit: 20, offset: 20, searchText: '' }
      },
      httpStatus: 200,
      response: {
        total: 289, userAuthenticated: false,
        jobPostings: [{
          title: 'A current Workday title, not a Tencent title binding',
          externalPath: '/job/South-Korea-Seoul/Tencent-Cloud---Technical-Account-Manager--Korea-_R108129',
          bulletFields: ['R108129']
        }]
      }
    }
  };
  return raw;
}
function canonicalURL(raw, url) {
  raw.canonical.url = raw.response.jobPostingInfo.externalUrl = url;
  raw.canonical.listing.response.jobPostings[0].externalPath = url.slice('https://tencent.wd1.myworkdayjobs.com/Tencent_Careers'.length);
}

// Explicit opt-in local replay: never fetch, execute website JS, or store native material in the repo.
const captureDir = process.env.TENCENT_WORKDAY_CAPTURE_DIR;
test('offline original R107760 GET accepts only its independently captured current public location binding', { skip: !captureDir }, () => {
  const read = file => JSON.parse(fs.readFileSync(captureDir + '/' + file, 'utf8'));
  const original = read('original-location-check.json'), collection = read('public-workday-collection.json');
  assert.throws(() => workday.validateDetail(original.evidence, original.officialUrl), /externalUrl binding/);
  const current = original.evidence.response.jobPostingInfo.externalUrl;
  // The first observed page has an observer wrapper, not Node wire evidence. Use the real Node health page.
  const pages = [read('maintenance-public-list-health.json'), ...collection.pages.slice(1)];
  assert.equal(pages.length, 15);
  assert.equal(pages.reduce((n, p) => n + p.response.jobPostings.length, 0), 289);
  const matches = pages.filter(p => p.response.jobPostings.some(row =>
    'https://tencent.wd1.myworkdayjobs.com/Tencent_Careers' + row.externalPath === current));
  assert.equal(matches.length, 1);
  const { request, httpStatus, response } = matches[0];
  const raw = { ...structuredClone(original.evidence), canonical: { url: current, listing: { request, httpStatus, response } } };
  const before = structuredClone(raw);
  assert.deepEqual(raw.request, workday.requestFor(original.officialUrl));
  assert.strictEqual(workday.validateDetail(raw, original.officialUrl), raw.response.jobPostingInfo);
  assert.equal(workday.description(raw, original.officialUrl), htmlText(original.evidence.response.jobPostingInfo.jobDescription));
  assert.deepEqual(raw, before);
  const nativeWrapper = structuredClone(raw);
  nativeWrapper.canonical.listing = collection.pages[0];
  assert.throws(() => workday.validateDetail(nativeWrapper, original.officialUrl), /Tencent Workday:/);
});

test('offline all 256+20 previously strict original-URL details remain unchanged without canonical evidence', { skip: !captureDir }, () => {
  const read = file => JSON.parse(fs.readFileSync(captureDir + '/' + file, 'utf8'));
  const first = read('public-workday-collection.json'), later = read('after-health-collection.json');
  assert.equal(first.details.length, 256); assert.equal(later.details.length, 20);
  for (const { officialUrl: url, evidence: raw } of [...first.details, ...later.details]) {
    const before = structuredClone(raw);
    assert.equal(Object.hasOwn(raw, 'canonical'), false);
    assert.strictEqual(workday.validateDetail(raw, url), raw.response.jobPostingInfo);
    assert.equal(workday.description(raw, url), htmlText(raw.response.jobPostingInfo.jobDescription));
    assert.deepEqual(raw, before);
  }
});

test('explicit canonical only binds a changed optional location, preserves full suffix, original GET and full HTML body', () => {
  for (const suffix of ['', '-1']) for (const location of ['South-Korea-Seoul/', '']) {
    const raw = canonicalEvidence();
    const url = officialUrl + suffix;
    raw.request = workday.requestFor(url);
    raw.response.jobPostingInfo.jobPostingId += suffix;
    canonicalURL(raw, url.replace('/SKorea-Seoul/', '/' + location));
    raw.canonical.listing.request.body.offset = location ? 20 : 0;
    // Body binding is structured JSON semantics, not property order or an observer {format,value} wrapper.
    raw.canonical.listing.request.body = { searchText: '', offset: raw.canonical.listing.request.body.offset, limit: 20, appliedFacets: {} };
    raw.response.jobPostingInfo.jobDescription += '<p>' + '完整尾段'.repeat(200) + '</p>';
    const before = structuredClone(raw);
    const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } };
    freeze(raw);
    assert.strictEqual(workday.validateDetail(raw, url), raw.response.jobPostingInfo);
    assert.equal(workday.description(raw, url), 'Business Unit\nCloud & Smart Industries\n' + '完整尾段'.repeat(200));
    assert.deepEqual(raw, before);
    assert.deepEqual(raw.request, workday.requestFor(url));
  }
});

test('canonical is never inferred, unchanged, malformed, cross-tenant/site/locale or a different full posting slug', () => {
  for (const value of [null, undefined, false, 1, '', [], {}, { url: officialUrl }]) {
    const raw = evidence(); raw.canonical = value;
    assert.throws(() => workday.validateDetail(raw, officialUrl), /Tencent Workday:/, String(value));
  }
  for (const url of [officialUrl,
    officialUrl.replace('/SKorea-Seoul/', '/South-Korea-Seoul/').replace('/Tencent_Careers/', '/en-US/Tencent_Careers/'),
    officialUrl.replace('/Tencent_Careers/', '/Other_Careers/'), officialUrl.replace('tencent.wd1', 'other.wd1'),
    officialUrl.replace('wd1', 'wd2'), officialUrl.replace('https:', 'http:'),
    officialUrl + '?lang=zh-CN', officialUrl + '#', officialUrl + '\n',
    officialUrl.replace('Technical-Account-Manager', 'Other-Title'), officialUrl + '-1',
    officialUrl.replace('_R108129', '_R108130')]) {
    const raw = canonicalEvidence(); canonicalURL(raw, url);
    assert.throws(() => workday.validateDetail(raw, officialUrl), /Tencent Workday:/, url);
    assert.throws(() => workday.description(raw, officialUrl), /Tencent Workday:/, url);
  }
  const raw = canonicalEvidence(); delete raw.canonical;
  assert.throws(() => workday.validateDetail(raw, officialUrl), /externalUrl binding/);
});

test('canonical independently requires exact public POST, typed anonymous HTTP200 page and one full-path/reqId reference', () => {
  const mutations = [
    raw => delete raw.canonical.listing,
    raw => raw.canonical.extra = 'unproven alias',
    raw => raw.canonical.listing.extra = 'unproven provenance',
    raw => delete raw.canonical.listing.request,
    raw => delete raw.canonical.listing.httpStatus,
    raw => raw.canonical.listing.httpStatus = '200',
    raw => raw.canonical.listing.httpStatus = 302,
    raw => delete raw.canonical.listing.response,
    raw => raw.canonical.listing.response.userAuthenticated = true,
    raw => raw.canonical.listing.response.userAuthenticated = 'false',
    raw => delete raw.canonical.listing.response.userAuthenticated,
    raw => raw.canonical.listing.response.total = '289',
    raw => raw.canonical.listing.response.total = -1,
    raw => raw.canonical.listing.response.total = 1.5,
    raw => raw.canonical.listing.response.total = Number.MAX_SAFE_INTEGER + 1,
    raw => delete raw.canonical.listing.response.total,
    raw => raw.canonical.listing.response.jobPostings = {},
    raw => raw.canonical.listing.response.jobPostings = [],
    raw => raw.canonical.listing.response.jobPostings = Array(21).fill(raw.canonical.listing.response.jobPostings[0]),
    raw => raw.canonical.listing.response.jobPostings.push(structuredClone(raw.canonical.listing.response.jobPostings[0])),
    raw => raw.canonical.listing.response.jobPostings[0].externalPath += '-1',
    raw => raw.canonical.listing.response.jobPostings[0].externalPath = raw.canonical.url,
    raw => raw.canonical.listing.response.jobPostings[0].bulletFields = ['R108130'],
    raw => raw.canonical.listing.response.jobPostings[0].bulletFields = 'R108129',
    raw => delete raw.canonical.listing.response.jobPostings[0].bulletFields,
    raw => raw.canonical.listing.request.url += '?signature=fake',
    raw => raw.canonical.listing.request.url = raw.canonical.listing.request.url.replace('/cxs/tencent/', '/cxs/other/'),
    raw => raw.canonical.listing.request.url = raw.canonical.listing.request.url.replace('/Tencent_Careers/', '/Other_Careers/'),
    raw => raw.canonical.listing.request.method = 'GET',
    raw => raw.canonical.listing.request.headers.Referer = officialUrl,
    raw => raw.canonical.listing.request.headers.Referer = raw.canonical.listing.request.headers.Referer.replace('/zh-CN/', '/en-US/'),
    raw => raw.canonical.listing.request.headers.Origin += '/',
    raw => delete raw.canonical.listing.request.body,
    raw => raw.canonical.listing.request.body = JSON.stringify(raw.canonical.listing.request.body),
    raw => raw.canonical.listing.request.body = { format: 'json', value: raw.canonical.listing.request.body },
    raw => raw.canonical.listing.request.body.appliedFacets = { location: ['invented'] },
    raw => raw.canonical.listing.request.body.searchText = 'AI',
    raw => raw.canonical.listing.request.body.limit = 100,
    raw => raw.canonical.listing.request.body.limit = '20',
    raw => raw.canonical.listing.request.body.signature = 'invented',
    ...[-20, 1, 20.5, '20', 300, 4000, Number.MAX_SAFE_INTEGER + 1].map(offset => raw => raw.canonical.listing.request.body.offset = offset),
    ...['Accept', 'Content-Type', 'Accept-Language', 'Referer', 'Origin'].map(header => raw => delete raw.canonical.listing.request.headers[header]),
    ...['Cookie', 'User-Agent', 'Authorization', 'Token'].map(header => raw => raw.canonical.listing.request.headers[header] = 'invented'),
    raw => raw.request = workday.requestFor(raw.canonical.url),
    raw => raw.httpStatus = 403,
    raw => raw.response.userAuthenticated = true,
    raw => raw.response.jobPostingInfo.jobPostingId += '-1',
    raw => raw.response.jobPostingInfo.jobReqId = 'R108130',
    raw => raw.response.jobPostingInfo.jobPostingSiteId = 'Other_Careers',
    raw => raw.response.jobPostingInfo.id = 'x'.repeat(32),
    raw => raw.response.jobPostingInfo.externalUrl = officialUrl,
    raw => raw.response.jobPostingInfo.extraJD = 'unexplained body',
    raw => raw.response.extraJD = 'unexplained body',
    raw => raw.canonical.listing.response.extraJD = 'unexplained body',
    raw => raw.canonical.listing.response.jobPostings[0].extraJD = 'unexplained body'
  ];
  for (const [i, mutate] of mutations.entries()) {
    const raw = canonicalEvidence(); mutate(raw);
    assert.throws(() => workday.validateDetail(raw, officialUrl), /Tencent Workday:/, 'mutation ' + i);
    assert.throws(() => workday.description(raw, officialUrl), /Tencent Workday:/, 'mutation ' + i);
  }
});
