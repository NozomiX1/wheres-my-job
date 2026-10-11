'use strict';
// 重试只针对临时性错误：网络错误／超时（fetch 抛错）、HTTP 5xx 和 408，最多再试 2 次（间隔 1 秒、3 秒）。
// 被官网拒绝（403／412／429 及其它 4xx）、重定向、验证页一律不重试，原样交给调用方，由它立即停止。
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const DELAYS = [1000, 3000];
const transientStatus = status => status >= 500 || status === 408;
// fetch 抛的 'fetch failed' 本身没信息，真正原因（连接重置、超时、域名解析失败等）在 error.cause 里。
const reasonOf = error => { const c = error?.cause, detail = c && (c.code || c.name) ? ' [' + [c.code || c.name, c.message && c.message !== error.message ? c.message : ''].filter(Boolean).join(': ') + ']' : ''; return (error?.message || String(error)) + detail; };

// attempt(i) → 结果（带 status 的响应对象亦可）。retryable(error) 判断异常是否临时性，默认全部是。
async function withRetry(attempt, { delays = DELAYS, sleepImpl = sleep, retryable = () => true, onRetry = () => {} } = {}) {
  for (let i = 0; ; i++) {
    let result;
    try { result = await attempt(i); }
    catch (error) {
      if (i >= delays.length || !retryable(error)) throw error;
      onRetry(i + 1, reasonOf(error)); await sleepImpl(delays[i]); continue;
    }
    if (i < delays.length && transientStatus(result?.status)) { onRetry(i + 1, 'HTTP ' + result.status); await sleepImpl(delays[i]); continue; }
    return result;
  }
}

// 给本进程的全局 fetch 加上述重试；子进程通过 NODE_OPTIONS=--require=retry-preload.js 启用，适配器无需改动。
function installFetchRetry({ log = line => process.stderr.write(line + '\n'), delays } = {}) {
  const original = globalThis.fetch;
  const hostOf = url => { try { return new URL(String(url)).host; } catch { return String(url).slice(0, 60); } };
  globalThis.fetch = (url, init = {}) => withRetry(
    // 超时信号用过就作废，重试换一个新的。
    i => original(url, i > 0 && init.signal ? { ...init, signal: AbortSignal.timeout(15000) } : init),
    { delays, onRetry: (n, why) => log('[retry] ' + hostOf(url) + ' ' + why + '（第' + n + '次重试）') })
    // 重试用尽仍失败时，适配器往往只报一句笼统的话；这里留下最后一次的真实原因。
    .catch(error => { log('[fetch-error] ' + hostOf(url) + ' ' + reasonOf(error)); throw error; });
}

module.exports = { reasonOf, withRetry, installFetchRetry, transientStatus, DELAYS };
