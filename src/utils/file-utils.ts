/**
 * 文件系统工具函数
 */

import { access, stat } from 'node:fs/promises'

/**
 * 检查路径是否存在
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * 检查路径是否为文件
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isFile()
  } catch {
    return false
  }
}

/**
 * 检查路径是否为目录
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}
