import { startRepl } from './cli/repl.js'

startRepl().catch((error) => {
  console.error('启动失败:', error)
  process.exit(1)
})
