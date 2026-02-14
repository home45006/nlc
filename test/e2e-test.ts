/**
 * 端到端测试 - 使用 DialogManager 验证完整链路
 * 包括: TTS生成、状态变更、多轮对话记忆、领域切换
 */
import 'dotenv/config'
import { GeminiProvider } from '../src/llm/providers/gemini.js'
import { ZhipuProvider } from '../src/llm/providers/zhipu.js'
import { DialogManager } from '../src/dialog/dialog-manager.js'
import { config } from '../src/config.js'

interface TestCase {
  readonly input: string
  readonly expect: {
    readonly domain?: string
    readonly hasCommand?: boolean
    readonly hasTts?: boolean
    readonly stateField?: string
  }
}

// 测试组定义
const testGroups: ReadonlyArray<{
  readonly name: string
  readonly cases: ReadonlyArray<TestCase>
  readonly resetBefore?: boolean
}> = [
  {
    name: '基础车控指令',
    cases: [
      { input: '把空调打开', expect: { domain: 'vehicle_control', hasCommand: true, hasTts: true, stateField: '空调' } },
      { input: '温度调到26度', expect: { domain: 'vehicle_control', hasCommand: true, hasTts: true, stateField: '空调温度' } },
      { input: '打开主驾车窗', expect: { domain: 'vehicle_control', hasCommand: true, hasTts: true, stateField: '主驾车窗' } },
      { input: '打开后备箱', expect: { domain: 'vehicle_control', hasCommand: true, hasTts: true, stateField: '后备箱' } },
    ],
  },
  {
    name: '音乐与导航',
    resetBefore: true,
    cases: [
      { input: '播放一首周杰伦的歌', expect: { domain: 'music', hasCommand: true, hasTts: true } },
      { input: '音量调到80', expect: { domain: 'music', hasCommand: true, hasTts: true, stateField: '音量' } },
      { input: '导航到上海外滩', expect: { domain: 'navigation', hasCommand: true, hasTts: true, stateField: '导航目的地' } },
    ],
  },
  {
    name: '闲聊与知识查询',
    resetBefore: true,
    cases: [
      { input: '你叫什么名字', expect: { domain: 'chat', hasCommand: false, hasTts: true } },
      { input: '还剩多少电', expect: { domain: 'chat', hasCommand: false, hasTts: true } },
      { input: '今天天气怎么样', expect: { domain: 'chat', hasCommand: false, hasTts: true } },
    ],
  },
  {
    name: '多轮对话记忆（上下文承接）',
    resetBefore: true,
    cases: [
      { input: '把空调温度调到24度', expect: { domain: 'vehicle_control', hasCommand: true, stateField: '空调温度' } },
      { input: '再高两度', expect: { domain: 'vehicle_control', hasCommand: true, stateField: '空调温度' } },
      { input: '切换到制热模式', expect: { domain: 'vehicle_control', hasCommand: true, stateField: '空调模式' } },
    ],
  },
  {
    name: '领域切换',
    resetBefore: true,
    cases: [
      { input: '打开空调', expect: { domain: 'vehicle_control', hasCommand: true } },
      { input: '播放音乐', expect: { domain: 'music', hasCommand: true } },
      { input: '导航到北京', expect: { domain: 'navigation', hasCommand: true } },
      { input: '你好', expect: { domain: 'chat', hasCommand: false } },
    ],
  },
]

async function runTests() {
  console.log('=== NLC 端到端验证测试 ===\n')

  const useGlm = process.argv.includes('--glm')
  const providerName = useGlm ? 'GLM' : 'Gemini'
  console.log(`使用模型: ${providerName}\n`)

  const provider = useGlm
    ? new ZhipuProvider(config.zhipuApiKey)
    : new GeminiProvider(config.geminiApiKey)
  const dialogManager = new DialogManager(provider)

  let totalCases = 0
  let passedCases = 0
  let failedCases = 0
  const failures: string[] = []

  for (const group of testGroups) {
    console.log(`\n━━━ ${group.name} ━━━`)

    if (group.resetBefore) {
      dialogManager.resetState()
    }

    for (const tc of group.cases) {
      totalCases++
      console.log(`\n  输入: "${tc.input}"`)

      try {
        const result = await dialogManager.handleInput(tc.input)
        const { output, stateChanges } = result

        console.log(`  领域: ${output.domain}`)
        console.log(`  意图: ${output.intent}`)
        console.log(`  TTS:  ${output.ttsText}`)
        console.log(`  延迟: ${output.meta.latencyMs}ms`)

        if (stateChanges.length > 0) {
          for (const c of stateChanges) {
            console.log(`  [变更] ${c.field}: ${c.from} → ${c.to}`)
          }
        }

        // 验证
        const errors: string[] = []

        if (tc.expect.domain && output.domain !== tc.expect.domain) {
          errors.push(`domain 期望 ${tc.expect.domain}，实际 ${output.domain}`)
        }
        if (tc.expect.hasCommand !== undefined && output.hasCommand !== tc.expect.hasCommand) {
          errors.push(`hasCommand 期望 ${tc.expect.hasCommand}，实际 ${output.hasCommand}`)
        }
        if (tc.expect.hasTts && !output.ttsText) {
          errors.push('期望有 TTS 文本，但为空')
        }
        if (tc.expect.stateField && stateChanges.length > 0) {
          const hasField = stateChanges.some(c => c.field.includes(tc.expect.stateField!))
          if (!hasField) {
            errors.push(`期望状态变更包含 "${tc.expect.stateField}"，实际: ${stateChanges.map(c => c.field).join(', ')}`)
          }
        }

        if (errors.length > 0) {
          console.log(`  ❌ 失败: ${errors.join('; ')}`)
          failedCases++
          failures.push(`"${tc.input}": ${errors.join('; ')}`)
        } else {
          console.log(`  ✅ 通过`)
          passedCases++
        }
      } catch (error) {
        console.log(`  ❌ 异常: ${error instanceof Error ? error.message : error}`)
        failedCases++
        failures.push(`"${tc.input}": 异常 - ${error instanceof Error ? error.message : error}`)
      }

      // 避免 API 限流
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // 打印最终车辆状态
  console.log('\n━━━ 最终车辆状态 ━━━')
  const finalState = dialogManager.stateManager.getState()
  console.log(`  空调: ${finalState.ac.isOn ? '开启' : '关闭'}, ${finalState.ac.temperature}°C, ${finalState.ac.mode}`)
  console.log(`  音乐: ${finalState.music.isPlaying ? '播放中' : '暂停'}, 音量${finalState.music.volume}%`)
  console.log(`  导航: ${finalState.navigation.isActive ? finalState.navigation.destination : '未激活'}`)

  // 汇总
  console.log('\n━━━ 测试汇总 ━━━')
  console.log(`  总计: ${totalCases}`)
  console.log(`  通过: ${passedCases}`)
  console.log(`  失败: ${failedCases}`)
  console.log(`  通过率: ${((passedCases / totalCases) * 100).toFixed(1)}%`)

  if (failures.length > 0) {
    console.log('\n  失败详情:')
    for (const f of failures) {
      console.log(`    - ${f}`)
    }
  }

  console.log('\n=== 测试完成 ===')
  process.exit(failedCases > 0 ? 1 : 0)
}

runTests()
