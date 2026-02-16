import { Domain, type DomainType, type LLMProvider } from '../types/index.js'

export interface RewrittenQuery {
  /** 改写后的独立 query */
  readonly query: string
  /** 落域 */
  readonly domain: DomainType
}

export interface IntentRewriterResult {
  /** 原始输入 */
  readonly original: string
  /** 改写后的 queries */
  readonly rewrittenQueries: RewrittenQuery[]
}

const SYSTEM_PROMPT = `你是一个意图拆分助手，负责将用户的复合指令拆分成多个独立的单意图指令。

## 支持的领域
- vehicle_control: 车辆控制（空调、车窗、座椅、灯光、后备箱、雨刮器）
- music: 音乐控制（播放、暂停、切歌、搜索、音量、模式）
- navigation: 导航控制（目的地、路线偏好、取消）
- chat: 闲聊（不属于以上任何领域）

## 规则
1. 将复合指令拆分成独立的单意图指令
2. 每个指令必须是完整、可独立理解的
3. 补充必要的上下文信息（如代词指代、省略表达）
4. 标注每个指令的领域

## 示例
输入："打开空调，温度调到24度，然后播放周杰伦的歌"
输出：
[
  {"query": "打开空调", "domain": "vehicle_control"},
  {"query": "将空调温度调到24度", "domain": "vehicle_control"},
  {"query": "播放周杰伦的歌", "domain": "music"}
]

输入："帮我把窗户打开一半，然后导航去机场"
输出：
[
  {"query": "将车窗打开一半", "domain": "vehicle_control"},
  {"query": "导航去机场", "domain": "navigation"}
]

输入："今天天气怎么样"
输出：
[
  {"query": "今天天气怎么样", "domain": "chat"}
]

输入："关了它"
（上下文：之前在调节空调）
输出：
[
  {"query": "关闭空调", "domain": "vehicle_control"}
]

## 输出格式
返回 JSON 数组，每个元素包含 query 和 domain 字段。`

export class IntentRewriter {
  constructor(private readonly provider: LLMProvider) {}

  async rewrite(userInput: string, context?: string): Promise<IntentRewriterResult> {
    const userPrompt = context
      ? `上下文：${context}\n\n用户输入："${userInput}"`
      : `用户输入："${userInput}"`

    const response = await this.provider.chat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      maxTokens: 512,
    })

    const content = response.content ?? '[]'
    const rewrittenQueries = this.parseResponse(content)

    return {
      original: userInput,
      rewrittenQueries,
    }
  }

  private parseResponse(content: string): RewrittenQuery[] {
    try {
      // 尝试提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return [{ query: content, domain: Domain.CHAT }]
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{ query: string; domain: string }>

      return parsed.map((item) => ({
        query: item.query,
        domain: this.normalizeDomain(item.domain),
      }))
    } catch {
      return [{ query: content, domain: Domain.CHAT }]
    }
  }

  private normalizeDomain(domain: string): DomainType {
    const domainMap: Record<string, DomainType> = {
      vehicle_control: Domain.VEHICLE_CONTROL,
      music: Domain.MUSIC,
      navigation: Domain.NAVIGATION,
      chat: Domain.CHAT,
    }

    return domainMap[domain.toLowerCase()] ?? Domain.CHAT
  }
}
