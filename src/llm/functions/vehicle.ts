import type { ToolDefinition } from '../../types/index.js'

export const vehicleFunctions: ReadonlyArray<ToolDefinition> = [
  {
    type: 'function',
    function: {
      name: 'control_ac',
      description: '控制车辆空调系统。包括开关空调、设置温度(16-32°C)、设置模式(制冷cool/制热heat/自动auto/通风ventilation)、设置风速(1-7)。例如："打开空调"、"空调调到24度"、"开制热"、"风速调到5"。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['turn_on', 'turn_off', 'set_temperature', 'set_mode', 'set_fan_speed'],
            description: '操作类型',
          },
          temperature: {
            type: 'number',
            minimum: 16,
            maximum: 32,
            description: '目标温度(摄氏度)，仅 set_temperature 时提供',
          },
          mode: {
            type: 'string',
            enum: ['cool', 'heat', 'auto', 'ventilation'],
            description: '空调模式，仅 set_mode 时提供',
          },
          fan_speed: {
            type: 'number',
            minimum: 1,
            maximum: 7,
            description: '风速(1-7)，仅 set_fan_speed 时提供',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_window',
      description: '控制车窗开关和开度。可指定位置：front_left(主驾)、front_right(副驾)、rear_left(左后)、rear_right(右后)、all(全部)。例如："打开主驾车窗"、"把窗户开一半"、"关闭所有车窗"、"窗户留个缝"。',
      parameters: {
        type: 'object',
        properties: {
          position: {
            type: 'string',
            enum: ['front_left', 'front_right', 'rear_left', 'rear_right', 'all'],
            description: '车窗位置，front_left=主驾，front_right=副驾',
          },
          action: {
            type: 'string',
            enum: ['open', 'close', 'set_position'],
            description: '操作类型，open=全开，close=全关，set_position=设置指定开度',
          },
          open_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: '开启百分比(0-100)，仅 set_position 时提供',
          },
        },
        required: ['position', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_seat',
      description: '控制座椅加热和通风。可指定座椅位置：driver(主驾)、passenger(副驾)。加热/通风等级1-3。例如："打开座椅加热"、"座椅加热调到3挡"、"关闭座椅通风"。',
      parameters: {
        type: 'object',
        properties: {
          seat: {
            type: 'string',
            enum: ['driver', 'passenger'],
            description: '座椅位置，默认driver(主驾)',
          },
          action: {
            type: 'string',
            enum: ['heating_on', 'heating_off', 'set_heating_level', 'ventilation_on', 'ventilation_off', 'set_ventilation_level'],
            description: '操作类型',
          },
          level: {
            type: 'number',
            minimum: 1,
            maximum: 3,
            description: '加热/通风等级(1-3)',
          },
        },
        required: ['seat', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_light',
      description: '控制车内灯光。灯光类型：ambient(氛围灯)、reading(阅读灯)。氛围灯支持颜色设置(红/蓝/绿/紫/橙/白等)。例如："打开氛围灯"、"氛围灯调成蓝色"、"关闭阅读灯"。',
      parameters: {
        type: 'object',
        properties: {
          light_type: {
            type: 'string',
            enum: ['ambient', 'reading'],
            description: '灯光类型',
          },
          action: {
            type: 'string',
            enum: ['turn_on', 'turn_off', 'set_color'],
            description: '操作类型',
          },
          color: {
            type: 'string',
            description: '颜色名称(红/蓝/绿/紫/橙/白)，仅氛围灯 set_color 时提供',
          },
        },
        required: ['light_type', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_trunk',
      description: '控制后备箱开关。例如："打开后备箱"、"关闭后备箱"。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['open', 'close'],
            description: '操作类型',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_wiper',
      description: '控制雨刮器。支持开关和速度(低速low/中速medium/高速high)。例如："打开雨刮器"、"雨刮调到最快"、"关闭雨刮"。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['turn_on', 'turn_off', 'set_speed'],
            description: '操作类型',
          },
          speed: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: '雨刮速度，仅 set_speed 时提供',
          },
        },
        required: ['action'],
      },
    },
  },
]
