import { startSkillRepl } from './cli/skill-repl.js'
import { logger } from './utils/logger.js'

startSkillRepl().catch((error) => {
  logger.error('启动失败:', error)
  process.exit(1)
})
