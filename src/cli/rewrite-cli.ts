#!/usr/bin/env node
import { GeminiProvider } from '../llm/providers/gemini.js'
import { ZhipuProvider } from '../llm/providers/zhipu.js'
import { IntentRewriter } from '../llm/intent-rewriter.js'
import { config } from '../config.js'

async function main() {
  const input = process.argv.slice(2).join(' ')

  if (!input) {
    console.log('用法: npm run rewrite <用户输入>')
    console.log('示例: npm run rewrite 打开空调并播放音乐')
    process.exit(1)
  }

  const provider = config.defaultModel === 'gemini'
    ? new GeminiProvider(config.geminiApiKey!)
    : new ZhipuProvider(config.zhipuApiKey!)

  const rewriter = new IntentRewriter(provider)
  const result = await rewriter.rewrite(input)

  console.log(`输入: "${result.original}"`)
  console.log('改写结果:')
  result.rewrittenQueries.forEach((q, i) => {
    console.log(`  ${i + 1}. [${q.domain}] "${q.query}"`)
  })
}

main().catch(console.error)
