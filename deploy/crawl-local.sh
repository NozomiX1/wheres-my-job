#!/bin/sh
# 在本机采集指定的来源，合并进 Release 上的正式数据。Actions 上某些来源反复失败时用来兜底（见 crawler/README.md「失败处理流程」）。
# 用法：deploy/crawl-local.sh [--full] <来源key>...     必须明确给出来源 key，不会默认全站采集。
# 环境变量：ANDE_DATA_REPO（默认 NozomiX1/wheres-my-job）、ANDE_DATA_TAG（默认 data）、ANDE_YES=1（跳过上传前确认）、
#          ANDE_DRY_RUN=1（只采集和汇总，不上传）、ANDE_UPDATE_CMD（采集命令，默认 node crawler/update.js；测试用）。需要已登录的 gh、Node 22+、tar。
set -eu
FULL=""; if [ "${1:-}" = "--full" ]; then FULL="--full"; shift; fi
[ "$#" -ge 1 ] || { echo "用法：deploy/crawl-local.sh [--full] <来源key>...（必须明确给出来源 key）" >&2; exit 2; }
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$HERE/..
REPO=${ANDE_DATA_REPO:-NozomiX1/wheres-my-job}; TAG=${ANDE_DATA_TAG:-data}

# 1. 同一时间只能有一个写入者：Actions 的采集在跑或排队时不动手。
for state in in_progress queued; do
  n=$(gh run list --repo "$REPO" --workflow crawl.yml --status "$state" --json databaseId --jq length)
  [ "$n" = 0 ] || { echo "Actions 的 crawl 工作流有 $n 个 $state 的运行，先等它结束再用本机兜底" >&2; exit 1; }
done

# 2. 独立工作目录：复制当前代码（不带 data、out、.git），不碰本机现有的 data/。
WORK=$(mktemp -d "${TMPDIR:-/tmp}/ande-local.XXXXXX"); trap 'rm -rf "$WORK"' EXIT
(cd "$ROOT" && tar --exclude=./data --exclude=./crawler/out --exclude=./.git --exclude=./node_modules -cf - .) | tar -xf - -C "$WORK"
cd "$WORK"

# 3. 取回正式数据当基线（取不到就失败，绝不在没有基线时继续，否则失败的来源会凭空消失）。
gh release download "$TAG" --repo "$REPO" -p data.tar.gz -D "$WORK"
tar -xzf data.tar.gz && rm data.tar.gz
node deploy/data-summary.js count data > before.json
BEFORE=$(cksum data/catalog.js)

# 4. 只采指定来源；个别来源失败不阻止其余已成功的合并。
set +e; ${ANDE_UPDATE_CMD:-node crawler/update.js} $FULL "$@"; echo "采集退出码 $?"; set -e
[ "$(cksum data/catalog.js)" != "$BEFORE" ] || { echo "数据没有变化，不上传"; exit 0; }

# 5. 汇总并确认。
node deploy/data-summary.js count data > after.json
echo "采集前后岗位数（标签 ${TAG}）："
node deploy/data-summary.js compare before.json after.json "$@"
[ -z "${ANDE_DRY_RUN:-}" ] || { echo "ANDE_DRY_RUN：只汇总，不上传"; exit 0; }
if [ -z "${ANDE_YES:-}" ]; then
  [ -t 0 ] || { echo "非交互环境，设置 ANDE_YES=1 才会上传" >&2; exit 1; }
  printf '上传到 %s 的标签 %s？[y/N] ' "$REPO" "$TAG"; read -r answer; [ "$answer" = y ] || { echo "已取消"; exit 1; }
fi

# 6. 打包并上传：先传数据包、后传 meta，和 Actions 工作流一致。
node crawler/pack-release.js out-release data
gh release upload "$TAG" out-release/data.tar.gz --repo "$REPO" --clobber
gh release upload "$TAG" out-release/data-meta.json --repo "$REPO" --clobber
echo "已上传。服务器会在 10 分钟内自动拉取。"
