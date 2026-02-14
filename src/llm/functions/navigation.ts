import type { ToolDefinition } from '../../types/index.js'

export const navigationFunctions: ReadonlyArray<ToolDefinition> = [
  {
    type: 'function',
    function: {
      name: 'control_navigation',
      description: '控制车辆导航。支持设置目的地、设置路线偏好(最快fastest/最短shortest/不走高速no_highway)、取消导航。例如："导航到北京天安门"、"带我去最近的充电桩"、"走高速"、"不走高速"、"取消导航"。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['set_destination', 'set_route_preference', 'cancel'],
            description: '操作类型',
          },
          destination: {
            type: 'string',
            description: '目的地名称或地址，仅 set_destination 时提供',
          },
          route_preference: {
            type: 'string',
            enum: ['fastest', 'shortest', 'no_highway'],
            description: '路线偏好，仅 set_route_preference 时提供',
          },
        },
        required: ['action'],
      },
    },
  },
]
