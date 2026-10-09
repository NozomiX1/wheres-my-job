'use strict';

const { isDeepStrictEqual: equal } = require('node:util');
const { htmlText } = require('../jd-text');
const ORIGIN = 'https://tencent.wd1.myworkdayjobs.com';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const check = (ok, message) => { if (!ok) throw new Error('Tencent Workday: ' + message); };

// Only the original Tencent-linked paths, with an optional observed location segment.
function posting(officialUrl) {
  const match = typeof officialUrl === 'string' && /^https:\/\/tencent\.wd1\.myworkdayjobs\.com\/Tencent_Careers\/job\/((?:[A-Za-z0-9_-]+\/)?([A-Za-z0-9_-]*_(R\d+)(?:-\d+)?))$/.exec(officialUrl);
  check(match && match[0] === officialUrl, 'unverified official URL');
  return { path: match[1], slug: match[2], reqId: match[3] };
}

function requestFor(officialUrl) {
  const { path } = posting(officialUrl);
  return {
    url: ORIGIN + '/wday/cxs/tencent/Tencent_Careers/job/' + path,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept-Language': 'zh-CN',
      Referer: ORIGIN + '/zh-CN/Tencent_Careers/job/' + path
    },
    body: null
  };
}

// The observed job renderer consumes jobDescription, plus optional videoInfo.
// Reject unexplained body aliases/extra JD, not unrelated optional metadata.
const JD_FIELD = /description|responsibilit|requirement|qualification|dut(?:y|ies)|jd|^(?:text|body|content|videoInfo)$/i;
function rejectExtraJD(data, knownField) {
  for (const [field, value] of Object.entries(data)) {
    if (field !== knownField && JD_FIELD.test(field)) {
      check(value === null || value === undefined || value === '', 'unknown extra JD field: ' + field);
    }
  }
}

// A current public listing can explain only the location segment of an original link.
// This is association evidence, never a replacement GET, public URL, title or source.
function canonicalUrl(canonical, officialUrl) {
  check(object(canonical) && equal(Object.keys(canonical).sort(), ['listing', 'url']), 'invalid canonical evidence');
  const original = posting(officialUrl), current = posting(canonical.url);
  check(canonical.url !== officialUrl && current.slug === original.slug, 'canonical full posting/location binding');
  const listing = canonical.listing;
  check(object(listing) && equal(Object.keys(listing).sort(), ['httpStatus', 'request', 'response']), 'invalid canonical listing evidence');
  const offset = listing.request?.body?.offset;
  check(Number.isSafeInteger(offset) && offset >= 0 && offset < 200 * 20 && offset % 20 === 0, 'canonical listing offset');
  check(equal(listing.request, {
    url: ORIGIN + '/wday/cxs/tencent/Tencent_Careers/jobs',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'zh-CN',
      Referer: ORIGIN + '/zh-CN/Tencent_Careers',
      Origin: ORIGIN
    },
    body: { appliedFacets: {}, limit: 20, offset, searchText: '' }
  }), 'canonical listing request binding');
  check(listing.httpStatus === 200, 'canonical listing HTTP refusal');
  const response = listing.response;
  check(object(response) && Object.hasOwn(response, 'userAuthenticated') && response.userAuthenticated === false, 'canonical listing anonymous response required');
  check(Object.hasOwn(response, 'total') && Number.isSafeInteger(response.total) && response.total >= 0 &&
    Object.hasOwn(response, 'jobPostings') && Array.isArray(response.jobPostings) && response.jobPostings.length <= 20 &&
    response.total > offset && response.total >= response.jobPostings.length, 'canonical listing total/jobPostings');
  rejectExtraJD(response);
  for (const row of response.jobPostings) {
    check(object(row) && Object.hasOwn(row, 'externalPath') && typeof row.externalPath === 'string' &&
      Object.hasOwn(row, 'bulletFields') && Array.isArray(row.bulletFields) && row.bulletFields.every(v => typeof v === 'string'), 'invalid canonical listing posting');
    rejectExtraJD(row);
  }
  const matches = response.jobPostings.filter(row => row.externalPath === '/job/' + current.path);
  check(matches.length === 1 && matches[0].bulletFields.includes(original.reqId), 'canonical listing full URL/reqId binding');
  return canonical.url;
}

function validateDetail(evidence, officialUrl) {
  const { slug, reqId } = posting(officialUrl);
  check(object(evidence) && Object.hasOwn(evidence, 'request') && equal(evidence.request, requestFor(officialUrl)), 'detail request binding');
  check(Object.hasOwn(evidence, 'httpStatus') && evidence.httpStatus === 200, 'detail HTTP refusal');
  const response = evidence.response;
  check(Object.hasOwn(evidence, 'response') && object(response) && Object.hasOwn(response, 'jobPostingInfo'), 'missing/invalid response.jobPostingInfo');
  check(Object.hasOwn(response, 'userAuthenticated') && response.userAuthenticated === false, 'anonymous response required');
  const info = response.jobPostingInfo;
  check(object(info) && ['jobDescription', 'title', 'id', 'jobReqId', 'jobPostingId', 'jobPostingSiteId', 'externalUrl'].every(k => Object.hasOwn(info, k)), 'missing/invalid jobPostingInfo fields');
  check(typeof info.jobDescription === 'string', 'invalid jobDescription');
  check(typeof info.title === 'string' && info.title.trim(), 'empty/invalid title');
  check(typeof info.id === 'string' && info.id.length === 32 && /^[0-9a-f]{32}$/i.test(info.id), 'invalid native GUID');
  check(info.jobReqId === reqId, 'jobReqId binding');
  check(info.jobPostingId === slug, 'jobPostingId binding');
  check(info.jobPostingSiteId === 'Tencent_Careers', 'jobPostingSiteId binding');
  const externalUrl = Object.hasOwn(evidence, 'canonical') ? canonicalUrl(evidence.canonical, officialUrl) : officialUrl;
  check(info.externalUrl === externalUrl, 'externalUrl binding');
  rejectExtraJD(response);
  rejectExtraJD(info, 'jobDescription');
  return info;
}

// 2026.40.17: job module 61267 -> 19629.VY (Be) -> 99219.LE (V),
// whose sanitized HTML is inserted with dangerouslySetInnerHTML, not TEXT.
function description(evidence, officialUrl) {
  return htmlText(validateDetail(evidence, officialUrl).jobDescription);
}

module.exports = { requestFor, validateDetail, description };
