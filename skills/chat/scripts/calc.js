#!/usr/bin/env node
/**
 * 计算器脚本
 *
 * 用法: node calc.js --expr "<表达式>"
 *
 * 支持基本数学运算：+ - * / ^ % 以及常用数学函数
 *
 * 输出格式 (JSON):
 * {
 *   "expression": "2 + 3 * 4",
 *   "result": 14,
 *   "success": true
 * }
 */

const VALID_MATH_FUNCTIONS = [
  'abs', 'ceil', 'floor', 'round', 'sqrt', 'cbrt',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'log', 'log10', 'log2', 'exp', 'pow',
  'min', 'max', 'random', 'PI', 'E'
]

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--expr' && i + 1 < args.length) {
      result.expression = args[i + 1]
      i++
    }
  }

  return result
}

function validateExpression(expr) {
  // 只允许数字、运算符、空格和数学函数
  const safePattern = /^[0-9+\-*/%^.()\s\w]+$/

  if (!safePattern.test(expr)) {
    return { valid: false, error: '表达式包含不允许的字符' }
  }

  // 检查是否有潜在的代码注入
  const dangerousPatterns = [
    /eval/,
    /Function/,
    /require/,
    /import/,
    /process/,
    /global/,
    /window/,
    /document/,
    /__proto__/,
    /constructor/
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(expr)) {
      return { valid: false, error: '表达式包含不允许的关键字' }
    }
  }

  return { valid: true }
}

function evaluateExpression(expr) {
  try {
    // 创建安全的数学环境
    const mathContext = {}
    for (const fn of VALID_MATH_FUNCTIONS) {
      if (typeof Math[fn] === 'function') {
        mathContext[fn] = Math[fn].bind(Math)
      } else if (Math[fn] !== undefined) {
        mathContext[fn] = Math[fn]
      }
    }

    // 构建安全的表达式
    const safeExpr = expr
      .replace(/\^/g, '**')  // 将 ^ 转换为 **
      .replace(/(\d+)!/g, 'factorial($1)') // 阶乘

    // 添加阶乘函数
    mathContext.factorial = (n) => {
      if (n < 0) return NaN
      if (n === 0 || n === 1) return 1
      let result = 1
      for (let i = 2; i <= n; i++) result *= i
      return result
    }

    // 使用 Function 构造器在隔离环境中执行
    const fnNames = Object.keys(mathContext)
    const fnValues = Object.values(mathContext)

    const compute = new Function(...fnNames, `return ${safeExpr}`)
    const result = compute(...fnValues)

    return { success: true, result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '计算错误'
    }
  }
}

function main() {
  const args = parseArgs()

  if (!args.expression) {
    console.log(JSON.stringify({
      success: false,
      error: '缺少 --expr 参数'
    }))
    process.exit(1)
  }

  const validation = validateExpression(args.expression)
  if (!validation.valid) {
    console.log(JSON.stringify({
      success: false,
      expression: args.expression,
      error: validation.error
    }))
    process.exit(1)
  }

  const evaluation = evaluateExpression(args.expression)

  console.log(JSON.stringify({
    expression: args.expression,
    result: evaluation.success ? evaluation.result : null,
    success: evaluation.success,
    error: evaluation.error || null
  }, null, 2))

  process.exit(evaluation.success ? 0 : 1)
}

main()
