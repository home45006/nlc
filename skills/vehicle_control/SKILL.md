# 车辆控制

控制车辆各项硬件功能，包括空调、车窗、座椅、灯光、后备箱和雨刮器。

## 能力描述

### ac_control - 空调控制

控制空调开关、温度、模式和风速。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: turn_on, turn_off, set_temperature, set_mode, set_fan_speed |
| temperature | number | 否 | 目标温度 (16-32度) |
| mode | enum | 否 | 空调模式: cool(制冷), heat(制热), auto(自动), vent(通风) |
| fan_speed | number | 否 | 风速档位 (1-7档) |

**示例：**

- 打开空调 -> `{ action: "turn_on" }`
- 关闭空调 -> `{ action: "turn_off" }`
- 温度调到24度 -> `{ action: "set_temperature", temperature: 24 }`
- 开启制冷模式 -> `{ action: "set_mode", mode: "cool" }`
- 风速调到2档 -> `{ action: "set_fan_speed", fan_speed: 2 }`

---

### window_control - 车窗控制

控制车窗开关和开度。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: open, close, set_position |
| position | enum | 否 | 车窗位置: front_left, front_right, rear_left, rear_right, all (默认 all) |
| percentage | number | 否 | 开度百分比 (0-100) |

**示例：**

- 打开车窗 -> `{ action: "open", position: "all" }`
- 关闭副驾车窗 -> `{ action: "close", position: "front_right" }`
- 把左后车窗开一半 -> `{ action: "set_position", position: "rear_left", percentage: 50 }`

---

### seat_control - 座椅控制

控制座椅加热和通风功能。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: heating_on, heating_off, ventilation_on, ventilation_off, set_level |
| seat | enum | 否 | 座椅位置: driver, passenger, rear_left, rear_right (默认 driver) |
| level | number | 否 | 档位 (1-3档) |
| feature | enum | 否 | 功能类型: heating, ventilation (set_level 时使用) |

**示例：**

- 打开座椅加热 -> `{ action: "heating_on", seat: "driver" }`
- 副驾座椅通风 -> `{ action: "ventilation_on", seat: "passenger" }`
- 座椅加热调到2档 -> `{ action: "set_level", feature: "heating", level: 2 }`

---

### light_control - 灯光控制

控制车内灯光，包括氛围灯和阅读灯。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: turn_on, turn_off, set_color, set_brightness |
| light_type | enum | 否 | 灯光类型: ambient, reading, headlight (默认 ambient) |
| color | string | 否 | 颜色名称 (如: 红色, 蓝色, 绿色) |
| brightness | number | 否 | 亮度 (0-100) |

**示例：**

- 打开氛围灯 -> `{ action: "turn_on", light_type: "ambient" }`
- 关闭阅读灯 -> `{ action: "turn_off", light_type: "reading" }`
- 把氛围灯调成蓝色 -> `{ action: "set_color", light_type: "ambient", color: "蓝色" }`

---

### trunk_control - 后备箱控制

控制后备箱开关。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: open, close |

**示例：**

- 打开后备箱 -> `{ action: "open" }`
- 关闭后备箱 -> `{ action: "close" }`

---

### wiper_control - 雨刮器控制

控制雨刮器开关和速度。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| action | enum | 是 | 操作类型: turn_on, turn_off, set_speed |
| speed | enum | 否 | 速度档位: low, medium, high, auto (默认 auto) |

**示例：**

- 打开雨刮器 -> `{ action: "turn_on" }`
- 关闭雨刮 -> `{ action: "turn_off" }`
- 雨刮调到高速 -> `{ action: "set_speed", speed: "high" }`

---

## 触发关键词

- 空调、温度、冷气、暖气、风速
- 车窗、窗户
- 座椅、加热、通风
- 灯、氛围灯、阅读灯
- 后备箱、尾箱
- 雨刮、雨刷

## 注意事项

1. 温度值范围: 16-32度
2. 风速档位: 1-7档
3. 座椅档位: 1-3档
4. 百分比值: 0-100
5. 所有控制操作都会返回语音反馈
