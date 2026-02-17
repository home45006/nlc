/**
 * 简单 YAML 解析器
 *
 * 支持基本 YAML 语法，足以处理 skill.yaml 格式
 * 不依赖外部库，保持轻量
 *
 * 支持的特性：
 * - 键值对
 * - 多行字符串（|）
 * - 数组（简单值和对象）
 * - 嵌套对象
 */

/**
 * 解析 YAML 值
 */
function parseYamlValue(value: string): unknown {
  // 布尔值
  if (value === 'true') return true
  if (value === 'false') return false

  // 数字
  const num = Number(value)
  if (!isNaN(num)) return num

  // 字符串（去除引号）
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  return value
}

/**
 * 解析简单的 YAML 内容
 *
 * @param content - YAML 字符串
 * @returns 解析后的对象
 */
export function parseSimpleYaml(content: string): Record<string, unknown> {
  const lines = content.split('\n')
  const root: Record<string, unknown> = {}

  // 上下文栈：每个元素是 { container, indent }
  // container 可以是对象或数组
  type Container = Record<string, unknown> | unknown[]
  const stack: Array<{ container: Container; indent: number }> = [
    { container: root, indent: -1 },
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // 计算缩进级别
    const indent = line.length - line.trimStart().length

    // 弹出栈直到找到当前缩进的父级
    // 规则：
    // - 如果当前行是数组项，需要找到数组容器
    // - 键值对需要找到正确的父对象
    while (stack.length > 1) {
      const top = stack[stack.length - 1]
      const topIndent = top.indent

      if (trimmed.startsWith('- ')) {
        // 数组项：需要找到数组容器
        // 数组容器的 indent 应该等于当前数组项的 indent（我们设置为数组键 indent + 2）
        // 或者数组项 indent 应该 > 数组容器 indent
        if (Array.isArray(top.container) && indent >= topIndent) {
          // 找到了数组容器
          break
        }
        // 否则继续弹出
        stack.pop()
      } else {
        // 键值对：indent <= 时弹出，> 时停止
        if (indent <= topIndent) {
          stack.pop()
        } else {
          break
        }
      }
    }

    const top = stack[stack.length - 1]

    // 处理数组项
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim()

      // 检查当前容器是否为数组
      if (!Array.isArray(top.container)) {
        // 如果不是数组，说明栈出了问题，跳过
        console.warn(`[YAML] Expected array but got object at line: ${trimmed}`)
        continue
      }

      const arr = top.container

      // 检查是否是对象格式
      if (value.includes(': ')) {
        const obj: Record<string, unknown> = {}
        const colonIdx = value.indexOf(': ')
        const key = value.slice(0, colonIdx).trim()
        const val = value.slice(colonIdx + 2).trim()
        obj[key] = parseYamlValue(val)
        arr.push(obj)
        // 把新对象推入栈，后续缩进的属性会添加到这个对象
        stack.push({ container: obj, indent })
      } else if (value.endsWith(':') && !value.includes(': ')) {
        // 只有 key: 的情况（后续行是值）
        const obj: Record<string, unknown> = {}
        arr.push(obj)
        stack.push({ container: obj, indent })
      } else {
        // 简单值
        arr.push(parseYamlValue(value))
      }
      continue
    }

    // 处理键值对（当前容器必须是对象）
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    // 确保当前容器是对象
    if (Array.isArray(top.container)) {
      // 数组中不能直接有键值对（应该在 - 后面）
      continue
    }

    const currentObj = top.container
    const key = trimmed.slice(0, colonIndex).trim()
    let value = trimmed.slice(colonIndex + 1).trim()

    // 处理多行字符串 |
    if (value === '|') {
      const multilineLines: string[] = []
      let j = i + 1
      while (j < lines.length) {
        const nextLine = lines[j]
        if (!nextLine.trim()) {
          j++
          continue
        }
        const nextIndent = nextLine.length - nextLine.trimStart().length
        if (nextIndent <= indent) break
        multilineLines.push(nextLine.trim())
        j++
      }
      i = j - 1
      value = multilineLines.join('\n')
      currentObj[key] = value
      continue
    }

    // 处理空值（可能是数组或嵌套对象的开始）
    if (value === '' || value === '[]') {
      // 查找后续第一个有效行（跳过空行和注释）
      let nextNonEmptyTrimmed: string | undefined
      let nextNonEmptyIndent = 0
      for (let k = i + 1; k < lines.length; k++) {
        const candidate = lines[k]
        const candidateTrimmed = candidate.trim()
        if (candidateTrimmed === '' || candidateTrimmed.startsWith('#')) continue
        nextNonEmptyTrimmed = candidateTrimmed
        nextNonEmptyIndent = candidate.length - candidate.trimStart().length
        break
      }
      if (nextNonEmptyTrimmed && nextNonEmptyIndent > indent && nextNonEmptyTrimmed.startsWith('-')) {
        // 这是一个数组
        const arr: unknown[] = []
        currentObj[key] = arr
        // 把数组推入栈，后续的数组项会添加到这个数组
        // 数组项的缩进通常比 key: 多2
        stack.push({ container: arr, indent: indent + 2 })
      } else if (nextNonEmptyTrimmed && nextNonEmptyIndent > indent && nextNonEmptyTrimmed.includes(':')) {
        // 这是一个嵌套对象
        const obj: Record<string, unknown> = {}
        currentObj[key] = obj
        stack.push({ container: obj, indent })
      } else {
        // 空字符串或空数组
        currentObj[key] = value === '[]' ? [] : ''
      }
      continue
    }

    // 普通键值对
    currentObj[key] = parseYamlValue(value)
  }

  return root
}
