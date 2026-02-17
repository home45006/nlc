/**
 * 简单的 Skill 测试 - 不需要交互输入
 */

import 'dotenv/config'
import { GeminiProvider } from '../src/llm/providers/gemini.js'
import { ZhipuProvider } from '../src/llm/providers/zhipu.js'
import type { LLMProvider } from '../src/types/llm.js'
import { createDefaultVehicleState } from '../src/types/vehicle.js'
import {
  createSkillOrchestrator,
  VehicleControlSkill,
  MusicSkill,
  NavigationSkill,
  ChatSkill,
} from '../src/skills/index.js'

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
}

async function main() {
  console.log('\n' + COLORS.bright + COLORS.cyan + '═══════════════════════════════════════════════════════════' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '  🚗 Skill Orchestrator 演示' + COLORS.reset)
  console.log(COLORS.bright + COLORS.cyan + '═══════════════════════════════════════════════════════════' + COLORS.reset + '\n')

  // 检查 API Key
  let provider: LLMProvider
  if (process.env.GEMINI_API_KEY) {
    console.log(COLORS.green + '✓ 使用 Gemini Provider' + COLORS.reset + '\n')
    provider = new GeminiProvider(process.env.GEMINI_API_KEY)
  } else if (process.env.ZHIPU_API_KEY) {
    console.log(COLORS.green + '✓ 使用 GLM Provider' + COLORS.reset + '\n')
    provider = new ZhipuProvider(process.env.ZHIPU_API_KEY)
  } else {
    console.error('请设置 GEMINI_API_KEY 或 ZHIPU_API_KEY')
    process.exit(1)
  }

  // 创建 Skills
  const skills = [
    new VehicleControlSkill(),
    new MusicSkill(),
    new NavigationSkill(),
    new ChatSkill(),
  ]

  // 显示已加载的 Skills
  console.log(COLORS.yellow + '📦 已加载 Skills:' + COLORS.reset)
  for (const skill of skills) {
    console.log(`   ${COLORS.green}●${COLORS.reset} ${skill.id} - ${skill.name}`)
  }
  console.log('')

  // 创建 Orchestrator（启用日志）
  const orchestrator = createSkillOrchestrator(provider, skills, {
    enableLogging: true,
  })

  // 测试用例
  const testCases = [
    '打开空调,导航到北京,播放周杰伦的稻香',
    '播放周杰伦的歌',
  ]

  const vehicleState = createDefaultVehicleState()

  for (let i = 0; i < testCases.length; i++) {
    const query = testCases[i]
    console.log(COLORS.yellow + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + COLORS.reset)
    console.log(COLORS.bright + `测试 ${i + 1}/${testCases.length}: "${query}"` + COLORS.reset)

    try {
      const result = await orchestrator.process(query, {
        vehicleState,
        dialogHistory: [],
      })

      console.log('\n' + COLORS.green + '✓ 处理完成' + COLORS.reset)
      console.log(COLORS.dim + '  成功: ' + COLORS.reset + result.success)
      console.log(COLORS.dim + '  指令数: ' + COLORS.reset + result.commands.length)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(COLORS.red + '错误: ' + message + COLORS.reset)
    }
    console.log('')
  }

  console.log(COLORS.yellow + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + COLORS.reset)
  console.log(COLORS.green + '✓ 所有测试完成' + COLORS.reset + '\n')
}

main().catch(console.error)
