/**
 * 新架构集成测试
 *
 * 运行方式: npx tsx src/__tests__/integration/new-architecture.test.ts
 */

import 'dotenv/config'
import { NewDialogManager } from '../../dialog/new-dialog-manager.js'
import { createProvider } from '../../llm/providers/index.js'
import type { DialogResult } from '../../dialog/new-dialog-manager.js'

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function log(color: keyof typeof colors, ...args: unknown[]) {
  console.log(colors[color], ...args, colors.reset)
}

function printResult(result: DialogResult, index: number) {
  console.log('\n' + '='.repeat(60))
  log('cyan', `测试 ${index + 1}: "${result.output.ttsText.slice(0, 30)}..."`)
  console.log('='.repeat(60))

  log('green', '领域:', result.output.domain)
  log('green', '意图:', result.output.intent)
  log('green', '置信度:', result.output.confidence.toFixed(2))
  log('green', 'TTS:', result.output.ttsText)
  log('green', '有指令:', result.output.hasCommand)

  if (result.stateChanges.length > 0) {
    log('yellow', '状态变更:')
    result.stateChanges.forEach(change => {
      console.log(`  - ${change.field}: ${change.from} → ${change.to}`)
    })
  }

  log('dim', `延迟: ${result.output.meta.latencyMs}ms`)
}

async function main() {
  console.log('\n' + '═'.repeat(60))
  log('cyan', '新架构集成测试 - 大模型中枢控制器')
  console.log('═'.repeat(60) + '\n')

  // 检查 API Key
  const apiKey = process.env.GEMINI_API_KEY || process.env.ZHIPU_API_KEY
  if (!apiKey) {
    log('red', '错误: 请设置 GEMINI_API_KEY 或 ZHIPU_API_KEY 环境变量')
    process.exit(1)
  }

  const model = process.env.DEFAULT_MODEL || 'gemini'
  log('yellow', `使用模型: ${model}`)
  log('yellow', `API Key: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`)

  // 创建 DialogManager
  const provider = createProvider(model)
  const manager = new NewDialogManager(provider)

  log('green', '\n✓ 初始化成功')
  log('dim', `已注册领域: ${manager.getStateManager ? 'vehicle, music, navigation, chat' : 'unknown'}`)

  // 测试用例
  const testCases = [
    // 车控领域
    { input: '打开空调', expectedDomain: 'vehicle_control' },
    { input: '把空调调到24度', expectedDomain: 'vehicle_control' },
    { input: '打开主驾车窗', expectedDomain: 'vehicle_control' },
    { input: '打开座椅加热', expectedDomain: 'vehicle_control' },

    // 音乐领域
    { input: '播放音乐', expectedDomain: 'music' },
    { input: '播放周杰伦的晴天', expectedDomain: 'music' },
    { input: '音量调到30', expectedDomain: 'music' },

    // 导航领域
    { input: '导航到北京天安门', expectedDomain: 'navigation' },
    { input: '取消导航', expectedDomain: 'navigation' },

    // 智能问答领域
    { input: '你好', expectedDomain: 'chat' },
    { input: '今天天气怎么样', expectedDomain: 'chat' },

    // 多意图
    { input: '打开空调并播放周杰伦的歌', expectedDomain: 'multi' },
  ]

  let passed = 0
  let failed = 0

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    console.log('\n' + '-'.repeat(40))
    log('cyan', `输入: "${testCase.input}"`)

    try {
      const result = await manager.handleInput(testCase.input)
      printResult(result, i)

      // 验证领域
      const actualDomain = result.output.domain
      if (testCase.expectedDomain === 'multi') {
        // 多意图测试，只要有指令就算通过
        if (result.output.hasCommand) {
          log('green', '✓ 多意图测试通过')
          passed++
        } else {
          log('red', '✗ 多意图测试失败 - 未检测到指令')
          failed++
        }
      } else if (actualDomain === testCase.expectedDomain) {
        log('green', `✓ 领域匹配: ${actualDomain}`)
        passed++
      } else {
        log('red', `✗ 领域不匹配: 期望 ${testCase.expectedDomain}, 实际 ${actualDomain}`)
        failed++
      }
    } catch (error) {
      log('red', `✗ 测试失败: ${error}`)
      failed++
    }
  }

  // 总结
  console.log('\n' + '═'.repeat(60))
  log('cyan', '测试总结')
  console.log('═'.repeat(60))
  log('green', `通过: ${passed}`)
  log('red', `失败: ${failed}`)
  log('yellow', `通过率: ${((passed / testCases.length) * 100).toFixed(1)}%`)

  // 最终状态
  console.log('\n' + '-'.repeat(40))
  log('cyan', '最终车辆状态:')
  const finalState = manager.getStateManager().getState()
  console.log(JSON.stringify(finalState, null, 2))

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(console.error)
