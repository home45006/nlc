import type { VehicleState, ApiResponse, ModelType } from '../types'

const API_BASE = '/api'

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    })

    const data = await response.json()
    return data as ApiResponse<T>
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

export const api = {
  // 获取车辆状态
  async getState(): Promise<ApiResponse<VehicleState>> {
    return fetchApi<VehicleState>('/state')
  },

  // 重置车辆状态
  async resetState(): Promise<ApiResponse<{ message: string }>> {
    return fetchApi<{ message: string }>('/state/reset', { method: 'POST' })
  },

  // 发送对话消息（HTTP 方式，备用）
  async sendMessage(message: string): Promise<
    ApiResponse<{
      ttsText: string
      stateChanges: Array<{ field: string; from: string; to: string }>
      vehicleState: VehicleState
    }>
  > {
    return fetchApi('/dialog', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  // 获取对话历史
  async getHistory(): Promise<
    ApiResponse<Array<{ role: string; content: string }>>
  > {
    return fetchApi('/history')
  },

  // 清除对话历史
  async clearHistory(): Promise<ApiResponse<{ message: string }>> {
    return fetchApi<{ message: string }>('/history', { method: 'DELETE' })
  },

  // 切换模型
  async switchModel(model: ModelType): Promise<ApiResponse<{ model: string }>> {
    return fetchApi<{ model: string }>('/model', {
      method: 'POST',
      body: JSON.stringify({ model }),
    })
  },

  // 获取当前模型
  async getModel(): Promise<ApiResponse<{ model: string }>> {
    return fetchApi<{ model: string }>('/model')
  },

  // 健康检查
  async health(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return fetchApi('/health')
  },
}
