import type { ToolDefinition } from '../../types/index.js'

export const musicFunctions: ReadonlyArray<ToolDefinition> = [
  {
    type: 'function',
    function: {
      name: 'control_music',
      description: '控制音乐播放。支持播放/暂停/上一首/下一首/搜索播放/设置音量(0-100)/设置播放模式。例如："播放音乐"、"暂停"、"下一首"、"播放周杰伦的晴天"、"音量调到30"、"音量大一点"、"单曲循环"。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['play', 'pause', 'next', 'previous', 'search_and_play', 'set_volume', 'set_play_mode'],
            description: '操作类型',
          },
          query: {
            type: 'string',
            description: '搜索关键词(歌名/歌手/风格)，仅 search_and_play 时提供',
          },
          volume: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: '目标音量(0-100)，仅 set_volume 时提供',
          },
          play_mode: {
            type: 'string',
            enum: ['sequential', 'shuffle', 'repeat_one'],
            description: '播放模式：sequential(顺序)、shuffle(随机)、repeat_one(单曲循环)',
          },
        },
        required: ['action'],
      },
    },
  },
]
