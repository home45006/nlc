import { startSkillRepl } from './cli/skill-repl.js'

startSkillRepl().catch((error) => {
  console.error('启动失败:', error)
  process.exit(1)
})
