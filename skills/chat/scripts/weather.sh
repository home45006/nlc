#!/bin/bash
#
# 天气查询脚本
#
# 用法: weather.sh --city <城市名> [--date <日期>]
#
# 输出格式 (JSON):
# {
#   "city": "北京",
#   "temperature": 25,
#   "condition": "晴",
#   "humidity": 45,
#   "wind": "东南风 3级"
# }
#

set -e

# 解析参数
CITY=""
DATE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --city)
            CITY="$2"
            shift 2
            ;;
        --date)
            DATE="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# 检查必需参数
if [ -z "$CITY" ]; then
    echo '{"error": "缺少城市参数"}'
    exit 1
fi

# 如果配置了 API Key，调用真实 API
if [ -n "$WEATHER_API_KEY" ]; then
    # 调用天气 API（示例）
    # curl -s "https://api.weather.com/v1?city=$CITY&key=$WEATHER_API_KEY"
    echo "{\"error\": \"API 调用未实现\"}"
    exit 0
fi

# 模拟天气数据（演示用）
case "$CITY" in
    北京|Beijing|beijing)
        TEMP=$((20 + RANDOM % 10))
        CONDITION="晴"
        HUMIDITY=$((30 + RANDOM % 30))
        WIND="东南风 2-3级"
        ;;
    上海|Shanghai|shanghai)
        TEMP=$((22 + RANDOM % 8))
        CONDITION="多云"
        HUMIDITY=$((50 + RANDOM % 30))
        WIND="东风 3-4级"
        ;;
    广州|Guangzhou|guangzhou)
        TEMP=$((25 + RANDOM % 8))
        CONDITION="晴间多云"
        HUMIDITY=$((60 + RANDOM % 25))
        WIND="南风 2级"
        ;;
    深圳|Shenzhen|shenzhen)
        TEMP=$((26 + RANDOM % 7))
        CONDITION="晴"
        HUMIDITY=$((55 + RANDOM % 25))
        WIND="东南风 2-3级"
        ;;
    *)
        TEMP=$((15 + RANDOM % 15))
        CONDITION="晴"
        HUMIDITY=$((40 + RANDOM % 30))
        WIND="微风"
        ;;
esac

# 添加日期信息
if [ -n "$DATE" ]; then
    DATE_INFO=", \"date\": \"$DATE\""
else
    DATE_INFO=""
fi

# 输出 JSON 结果
cat <<EOF
{
    "city": "$CITY",
    "temperature": $TEMP,
    "condition": "$CONDITION",
    "humidity": $HUMIDITY,
    "wind": "$WIND"$DATE_INFO
}
EOF
