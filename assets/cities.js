'use strict';
// 工作地点归一化：岗位官网 city 字符串 → 城市名集合（浏览器、服务端、发布目录共用，只此一份）。
// 只取城市：省名/自治区名、空值、认不出的都不产生城市，由调用方当作“城市未标明”。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ANDE_CITIES = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PROVINCE = /(省|自治区)$/;
  // 官网把城市写成英文、别名或所属区时，归到同一个城市。只收见过的写法；表里没有的区保持原样。
  const ALIASES = {
    Beijing: '北京', Shanghai: '上海', Shenzhen: '深圳', Hangzhou: '杭州', Guangzhou: '广州', Chengdu: '成都', Singapore: '新加坡',
    Nanjing: '南京', Nantong: '南通', Zhuhai: '珠海', Chongqing: '重庆', Jinan: '济南', Guilin: '桂林', Zhengzhou: '郑州', Shenyang: '沈阳',
    Qingdao: '青岛', Suzhou: '苏州', Urumqi: '乌鲁木齐', Hohhot: '呼和浩特', Xishuangbanna: '西双版纳', London: '伦敦', Dubai: '迪拜',
    Seoul: '首尔', Paris: '巴黎', Amsterdam: '阿姆斯特丹', Sydney: '悉尼', Bangkok: '曼谷', Osaka: '大阪', Frankfurt: '法兰克福', Auckland: '奥克兰',
    'Kuala Lumpur': '吉隆坡', 'Los Angeles': '洛杉矶', 'Palo Alto': '帕洛阿尔托',
    '香港特别行政区': '香港', '中国香港': '香港', 'Hong Kong': '香港', '澳门特别行政区': '澳门', '中国澳门': '澳门', '新加坡共和国': '新加坡',
    '海淀区': '北京', '徐汇区': '上海', '黄浦区': '上海', '浦东新区': '上海', '嘉定区': '上海', '南山区': '深圳', '拱墅区': '杭州', '上城区': '杭州'
  };

  function cityOfToken(token) {
    const segments = token.replace(/总部$/, '').split(/[-·]/).map(s => s.trim()).filter(Boolean);
    for (const s of segments) if (ALIASES[s]) return ALIASES[s];
    const rest = segments.filter(s => !PROVINCE.test(s));
    const name = rest.find(s => /市$/.test(s)) ?? rest[rest.length - 1];
    return name ? name.replace(/(.{2,})市$/, '$1') : '';
  }

  const cache = new Map();
  function cityKeys(city) {
    const key = typeof city === 'string' ? city : '';
    let keys = cache.get(key);
    if (!keys) {
      // 空格只在含中文时当分隔符（“深圳总部 上海 澄迈县”）；纯英文里的空格属于地名（Palo Alto）。
      const parts = key.split(/[\/,，、;；|]/).flatMap(p => /[\u4e00-\u9fff]/.test(p) ? p.split(/\s+/) : [p]);
      keys = [...new Set(parts.map(t => t.trim()).filter(Boolean).map(cityOfToken).filter(Boolean))];
      if (cache.size > 5000) cache.clear();
      cache.set(key, keys);
    }
    return keys;
  }

  return { cityKeys };
});
