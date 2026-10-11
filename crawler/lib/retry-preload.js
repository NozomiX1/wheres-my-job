'use strict';
require('./retry').installFetchRetry();
// 适配器以退出码 0 退出、却没写出结果文件，多半是事件循环空了（某个请求悬着）；留一行证据，便于事后查。
const raw = process.argv.slice(2).reverse().find(arg => /_raw\.json$/.test(arg));
if (raw) process.on('exit', code => {
  if (code === 0 && !require('node:fs').existsSync(raw)) console.error('[exit] 进程以 0 退出但没写出 ' + require('node:path').basename(raw) + '；运行 ' + Math.round(process.uptime()) + ' 秒，剩余活动资源：' + JSON.stringify(process.getActiveResourcesInfo()));
});
