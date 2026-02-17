# 音乐控制

控制音乐播放，包括播放暂停、切歌、搜索、音量和播放模式。

## 能力描述

### play_pause - 播放控制

控制音乐的播放、暂停和继续。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: play(播放), pause(暂停), resume(继续) |

**示例：**

- 播放音乐 -> `{ action: "play" }`
- 暂停 -> `{ action: "pause" }`
- 继续播放 -> `{ action: "resume" }`

---

### next_previous - 切歌控制

切换到上一首或下一首歌曲。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: next(下一首), previous(上一首) |

**示例：**

- 下一首 -> `{ action: "next" }`
- 上一首 -> `{ action: "previous" }`
- 切歌 -> `{ action: "next" }`

---

### search_and_play - 搜索播放

根据歌名、歌手或音乐类型搜索并播放。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| song | string | 否 | 歌曲名 |
| artist | string | 否 | 歌手名 |
| genre | enum | 否 | 音乐类型: pop, rock, classical, jazz, electronic, folk, r_and_b |

**示例：**

- 播放周杰伦的歌 -> `{ artist: "周杰伦" }`
- 我想听稻香 -> `{ song: "稻香" }`
- 来首轻音乐 -> `{ genre: "classical" }`
- 播放七里香 -> `{ song: "七里香", artist: "周杰伦" }`

---

### volume_control - 音量控制

调节音乐音量大小。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: increase(增大), decrease(减小), set(设置), mute(静音), unmute(取消静音) |
| volume | number | 否 | 音量值 (0-100)，仅在 action=set 时使用 |

**示例：**

- 调大音量 -> `{ action: "increase" }`
- 音量调到50 -> `{ action: "set", volume: 50 }`
- 静音 -> `{ action: "mute" }`
- 取消静音 -> `{ action: "unmute" }`
- 小声一点 -> `{ action: "decrease" }`

---

### play_mode - 播放模式

切换播放模式。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| mode | enum | 是 | 播放模式: sequential(顺序), random(随机), single_loop(单曲循环) |

**示例：**

- 随机播放 -> `{ mode: "random" }`
- 单曲循环 -> `{ mode: "single_loop" }`
- 顺序播放 -> `{ mode: "sequential" }`

---

## 触发关键词

- 播放、暂停、继续
- 下一首、上一首、切歌
- 音量、大声、小声、静音
- 随机、循环、顺序
- 听、搜索

## 音乐类型说明

| 类型 | 中文名称 |
|------|----------|
| pop | 流行音乐 |
| rock | 摇滚音乐 |
| classical | 古典音乐 |
| jazz | 爵士音乐 |
| electronic | 电子音乐 |
| folk | 民谣 |
| r_and_b | 节奏布鲁斯 |

## 注意事项

1. 音量值范围: 0-100
2. 搜索时 song、artist、genre 参数可以任意组合
3. 切换播放模式会立即生效
