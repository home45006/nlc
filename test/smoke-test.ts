/**
 * 快速冒烟测试 - 验证 Gemini API 调用和核心链路
 */
import 'dotenv/config'
import { GeminiProvider } from '../src/llm/providers/gemini.js'
import { ZhipuProvider } from '../src/llm/providers/zhipu.js'
import { LLMOrchestrator } from '../src/llm/orchestrator.js'
import { VehicleStateManager } from '../src/executor/vehicle-state.js'
import { CommandExecutor } from '../src/executor/command-executor.js'
import { config } from '../src/config.js'

async function main() {
  const useGlm = process.argv.includes('--glm')
  const providerName = useGlm ? 'GLM' : 'Gemini'
  console.log(`=== NLC 冒烟测试 (${providerName}) ===\n`)

  const provider = useGlm
    ? new ZhipuProvider(config.zhipuApiKey)
    : new GeminiProvider(config.geminiApiKey)
  const orchestrator = new LLMOrchestrator(provider)
  const stateManager = new VehicleStateManager()
  const executor = new CommandExecutor(stateManager)

  const testCases = [
    '把空调调到24度',
    '播放周杰伦的晴天',
    '导航到天安门',
    '还剩多少电',
    '你叫什么名字',
  ]

  for (const input of testCases) {
    console.log(`\n--- 测试: "${input}" ---`)
    try {
      const { output, toolCalls } = await orchestrator.process(
        input,
        [],
        stateManager.getState(),
      )

      console.log(`  Domain: ${output.domain}`)
      console.log(`  Intent: ${output.intent}`)
      console.log(`  Slots:  ${JSON.stringify(output.slots)}`)
      console.log(`  TTS:    ${output.ttsText}`)
      console.log(`  延迟:   ${output.meta.latencyMs}ms`)
      console.log(`  Tokens: ${output.meta.tokens.prompt}+${output.meta.tokens.completion}`)

      if (toolCalls.length > 0) {
        const changes = executor.execute(toolCalls)
        for (const c of changes) {
          console.log(`  [变更] ${c.field}: ${c.from} → ${c.to}`)
        }
      }
    } catch (error) {
      console.log(`  [错误] ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log('\n=== 测试完成 ===')
}

main()
