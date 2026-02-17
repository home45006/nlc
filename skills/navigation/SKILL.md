# 导航控制

导航功能，包括设置目的地、路线偏好、取消导航和查询状态。

## 能力描述

### set_destination - 设置目的地

设置导航目的地并开始导航。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| destination | string | 是 | 目的地名称 |
| city | string | 否 | 城市名称（可选，用于消歧） |

**示例：**

- 导航到国贸 -> `{ destination: "国贸" }`
- 我要去机场 -> `{ destination: "机场" }`
- 带我去天安门 -> `{ destination: "天安门" }`
- 导航到上海外滩 -> `{ destination: "外滩", city: "上海" }`

---

### route_preference - 路线偏好

选择路线规划偏好。

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| preference | enum | 是 | 路线偏好: highway, avoid_toll, avoid_traffic, shortest, fastest |

**偏好说明：**

| 偏好值 | 说明 |
|--------|------|
| highway | 优先高速 |
| avoid_toll | 避开收费 |
| avoid_traffic | 避开拥堵 |
| shortest | 最短路线 |
| fastest | 最快路线 |

**示例：**

- 走高速 -> `{ preference: "highway" }`
- 避开收费 -> `{ preference: "avoid_toll" }`
- 避开拥堵 -> `{ preference: "avoid_traffic" }`
- 最短路线 -> `{ preference: "shortest" }`
- 最快路线 -> `{ preference: "fastest" }`

---

### cancel_navigation - 取消导航

取消当前正在进行的导航。

**参数：** 无

**示例：**

- 取消导航
- 结束导航
- 停止导航
- 不要导航了

---

### get_status - 获取导航状态

查询当前导航的状态信息，包括剩余距离和时间。

**参数：** 无

**示例：**

- 还有多远
- 还要多久
- 现在到哪了
- 距离终点还有多远
- 还需要开多久

---

## 触发关键词

- 导航、去、到
- 高速、拥堵、路线、避开
- 取消、结束、停止
- 多远、多久、到哪

## 使用场景

1. **开始导航**: 使用 `set_destination` 设置目的地
2. **调整路线**: 在导航过程中使用 `route_preference` 切换路线
3. **查询进度**: 使用 `get_status` 查看剩余距离和时间
4. **结束导航**: 使用 `cancel_navigation` 取消导航

## 注意事项

1. 目的地名称应尽可能具体，避免歧义
2. 如果目的地有歧义，可以添加城市参数
3. 路线偏好可以在导航开始前或导航过程中设置
4. 取消导航后会清除当前路线
