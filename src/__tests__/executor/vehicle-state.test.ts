import { describe, it, expect, beforeEach } from 'vitest'
import { VehicleStateManager } from '../../executor/vehicle-state.js'
import { createDefaultVehicleState } from '../../types/index.js'

describe('VehicleStateManager', () => {
  let manager: VehicleStateManager

  beforeEach(() => {
    manager = new VehicleStateManager()
  })

  describe('初始化', () => {
    it('应该用默认状态初始化', () => {
      const state = manager.getState()
      const defaultState = createDefaultVehicleState()

      expect(state.ac.isOn).toBe(false)
      expect(state.ac.temperature).toBe(26)
      expect(state.music.volume).toBe(50)
      expect(state.navigation.isActive).toBe(false)
      expect(state).toEqual(defaultState)
    })
  })

  describe('reset', () => {
    it('应该重置为默认状态', () => {
      // 修改状态
      manager.applyCommand('control_ac', { action: 'turn_on' })
      manager.applyCommand('control_music', { action: 'set_volume', volume: 80 })

      // 重置
      manager.reset()

      const state = manager.getState()
      expect(state.ac.isOn).toBe(false)
      expect(state.music.volume).toBe(50)
    })
  })

  describe('control_ac', () => {
    it('应该打开空调', () => {
      const changes = manager.applyCommand('control_ac', { action: 'turn_on' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '空调', from: '关闭', to: '开启' })
      expect(manager.getState().ac.isOn).toBe(true)
    })

    it('空调已开启时不应该重复记录变更', () => {
      manager.applyCommand('control_ac', { action: 'turn_on' })
      const changes = manager.applyCommand('control_ac', { action: 'turn_on' })

      expect(changes).toHaveLength(0)
    })

    it('应该关闭空调', () => {
      manager.applyCommand('control_ac', { action: 'turn_on' })
      const changes = manager.applyCommand('control_ac', { action: 'turn_off' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '空调', from: '开启', to: '关闭' })
      expect(manager.getState().ac.isOn).toBe(false)
    })

    it('应该设置温度并自动开启空调', () => {
      const changes = manager.applyCommand('control_ac', {
        action: 'set_temperature',
        temperature: 24,
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '空调温度', from: '26°C', to: '24°C' })
      expect(manager.getState().ac.temperature).toBe(24)
      expect(manager.getState().ac.isOn).toBe(true)
    })

    it('应该设置空调模式', () => {
      const changes = manager.applyCommand('control_ac', {
        action: 'set_mode',
        mode: 'cool',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '空调模式', from: '自动', to: '制冷' })
      expect(manager.getState().ac.mode).toBe('cool')
      expect(manager.getState().ac.isOn).toBe(true)
    })

    it('应该设置风速', () => {
      const changes = manager.applyCommand('control_ac', {
        action: 'set_fan_speed',
        fan_speed: 5,
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '风速', from: '3', to: '5' })
      expect(manager.getState().ac.fanSpeed).toBe(5)
    })
  })

  describe('control_window', () => {
    it('应该打开车窗到100%', () => {
      const changes = manager.applyCommand('control_window', {
        action: 'open',
        position: 'front_left',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '主驾车窗', from: '0%', to: '100%' })
      expect(manager.getState().windows.frontLeft).toBe(100)
    })

    it('应该关闭车窗到0%', () => {
      manager.applyCommand('control_window', { action: 'open', position: 'front_right' })
      const changes = manager.applyCommand('control_window', {
        action: 'close',
        position: 'front_right',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '副驾车窗', from: '100%', to: '0%' })
      expect(manager.getState().windows.frontRight).toBe(0)
    })

    it('应该设置车窗开度百分比', () => {
      const changes = manager.applyCommand('control_window', {
        action: 'set_position',
        position: 'rear_left',
        open_percentage: 50,
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '左后车窗', from: '0%', to: '50%' })
      expect(manager.getState().windows.rearLeft).toBe(50)
    })

    it('应该同时控制所有车窗', () => {
      const changes = manager.applyCommand('control_window', {
        action: 'open',
        position: 'all',
      })

      // 实现为每个车窗生成一个变更记录
      expect(changes).toHaveLength(4)
      expect(manager.getState().windows.frontLeft).toBe(100)
      expect(manager.getState().windows.frontRight).toBe(100)
      expect(manager.getState().windows.rearLeft).toBe(100)
      expect(manager.getState().windows.rearRight).toBe(100)
    })
  })

  describe('control_seat', () => {
    it('应该打开座椅加热', () => {
      const changes = manager.applyCommand('control_seat', {
        action: 'heating_on',
        seat: 'driver',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '主驾座椅加热', from: '0挡', to: '1挡' })
      expect(manager.getState().seats.driverHeating).toBe(1)
    })

    it('应该关闭座椅加热', () => {
      manager.applyCommand('control_seat', { action: 'heating_on', seat: 'driver' })
      const changes = manager.applyCommand('control_seat', {
        action: 'heating_off',
        seat: 'driver',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '主驾座椅加热', from: '1挡', to: '关闭' })
      expect(manager.getState().seats.driverHeating).toBe(0)
    })

    it('应该设置座椅加热档位', () => {
      const changes = manager.applyCommand('control_seat', {
        action: 'set_heating_level',
        seat: 'passenger',
        level: 3,
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '副驾座椅加热', from: '0挡', to: '3挡' })
      expect(manager.getState().seats.passengerHeating).toBe(3)
    })

    it('应该打开座椅通风', () => {
      const changes = manager.applyCommand('control_seat', {
        action: 'ventilation_on',
        seat: 'driver',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '主驾座椅通风', from: '0挡', to: '1挡' })
      expect(manager.getState().seats.driverVentilation).toBe(1)
    })

    it('应该设置座椅通风档位', () => {
      const changes = manager.applyCommand('control_seat', {
        action: 'set_ventilation_level',
        seat: 'passenger',
        level: 2,
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '副驾座椅通风', from: '0挡', to: '2挡' })
      expect(manager.getState().seats.passengerVentilation).toBe(2)
    })
  })

  describe('control_light', () => {
    it('应该打开氛围灯', () => {
      const changes = manager.applyCommand('control_light', {
        action: 'turn_on',
        light_type: 'ambient',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '氛围灯', from: '关闭', to: '开启' })
      expect(manager.getState().lights.ambientOn).toBe(true)
    })

    it('应该关闭氛围灯', () => {
      manager.applyCommand('control_light', { action: 'turn_on', light_type: 'ambient' })
      const changes = manager.applyCommand('control_light', {
        action: 'turn_off',
        light_type: 'ambient',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '氛围灯', from: '开启', to: '关闭' })
      expect(manager.getState().lights.ambientOn).toBe(false)
    })

    it('应该设置氛围灯颜色', () => {
      const changes = manager.applyCommand('control_light', {
        action: 'set_color',
        light_type: 'ambient',
        color: '蓝色',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '氛围灯颜色', from: '#FFFFFF', to: '蓝色' })
      expect(manager.getState().lights.ambientColor).toBe('蓝色')
      expect(manager.getState().lights.ambientOn).toBe(true)
    })

    it('应该打开阅读灯', () => {
      const changes = manager.applyCommand('control_light', {
        action: 'turn_on',
        light_type: 'reading',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '阅读灯', from: '关闭', to: '开启' })
      expect(manager.getState().lights.readingOn).toBe(true)
    })

    it('应该关闭阅读灯', () => {
      manager.applyCommand('control_light', { action: 'turn_on', light_type: 'reading' })
      const changes = manager.applyCommand('control_light', {
        action: 'turn_off',
        light_type: 'reading',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '阅读灯', from: '开启', to: '关闭' })
      expect(manager.getState().lights.readingOn).toBe(false)
    })
  })

  describe('control_trunk', () => {
    it('应该打开后备箱', () => {
      const changes = manager.applyCommand('control_trunk', { action: 'open' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '后备箱', from: '关闭', to: '打开' })
      expect(manager.getState().trunk.isOpen).toBe(true)
    })

    it('应该关闭后备箱', () => {
      manager.applyCommand('control_trunk', { action: 'open' })
      const changes = manager.applyCommand('control_trunk', { action: 'close' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '后备箱', from: '打开', to: '关闭' })
      expect(manager.getState().trunk.isOpen).toBe(false)
    })
  })

  describe('control_wiper', () => {
    it('应该打开雨刮器', () => {
      const changes = manager.applyCommand('control_wiper', { action: 'turn_on' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '雨刮器', from: '关闭', to: '开启(低速)' })
      expect(manager.getState().wiper.isOn).toBe(true)
    })

    it('应该关闭雨刮器', () => {
      manager.applyCommand('control_wiper', { action: 'turn_on' })
      const changes = manager.applyCommand('control_wiper', { action: 'turn_off' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '雨刮器', from: '开启', to: '关闭' })
      expect(manager.getState().wiper.isOn).toBe(false)
    })

    it('应该设置雨刮速度', () => {
      const changes = manager.applyCommand('control_wiper', {
        action: 'set_speed',
        speed: 'high',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '雨刮速度', from: '低速', to: '高速' })
      expect(manager.getState().wiper.speed).toBe('high')
      expect(manager.getState().wiper.isOn).toBe(true)
    })
  })

  describe('control_music', () => {
    it('应该播放音乐', () => {
      const changes = manager.applyCommand('control_music', { action: 'play' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '音乐', from: '暂停', to: '播放' })
      expect(manager.getState().music.isPlaying).toBe(true)
    })

    it('应该暂停音乐', () => {
      manager.applyCommand('control_music', { action: 'play' })
      const changes = manager.applyCommand('control_music', { action: 'pause' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '音乐', from: '播放', to: '暂停' })
      expect(manager.getState().music.isPlaying).toBe(false)
    })

    it('应该搜索并播放音乐', () => {
      const changes = manager.applyCommand('control_music', {
        action: 'search_and_play',
        query: '周杰伦 晴天',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: '音乐',
        from: '无',
        to: '搜索并播放: 周杰伦 晴天',
      })
      expect(manager.getState().music.isPlaying).toBe(true)
      expect(manager.getState().music.track).toBe('周杰伦 晴天')
    })

    it('应该切换到下一首', () => {
      const changes = manager.applyCommand('control_music', { action: 'next' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '音乐', from: '当前曲目', to: '下一首' })
    })

    it('应该切换到上一首', () => {
      const changes = manager.applyCommand('control_music', { action: 'previous' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '音乐', from: '当前曲目', to: '上一首' })
    })

    it('应该设置音量', () => {
      const changes = manager.applyCommand('control_music', {
        action: 'set_volume',
        volume: 70,
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '音量', from: '50%', to: '70%' })
      expect(manager.getState().music.volume).toBe(70)
    })

    it('应该设置播放模式', () => {
      const changes = manager.applyCommand('control_music', {
        action: 'set_play_mode',
        play_mode: 'shuffle',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '播放模式', from: '顺序播放', to: '随机播放' })
      expect(manager.getState().music.mode).toBe('shuffle')
    })
  })

  describe('control_navigation', () => {
    it('应该设置导航目的地', () => {
      const changes = manager.applyCommand('control_navigation', {
        action: 'set_destination',
        destination: '天安门',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '导航目的地', from: '无', to: '天安门' })
      expect(manager.getState().navigation.isActive).toBe(true)
      expect(manager.getState().navigation.destination).toBe('天安门')
    })

    it('应该设置路线偏好', () => {
      const changes = manager.applyCommand('control_navigation', {
        action: 'set_route_preference',
        route_preference: 'no_highway',
      })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '路线偏好', from: '最快', to: '不走高速' })
      expect(manager.getState().navigation.routePreference).toBe('no_highway')
    })

    it('应该取消导航', () => {
      manager.applyCommand('control_navigation', {
        action: 'set_destination',
        destination: '天安门',
      })
      const changes = manager.applyCommand('control_navigation', { action: 'cancel' })

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ field: '导航', from: '导航中', to: '已取消' })
      expect(manager.getState().navigation.isActive).toBe(false)
      expect(manager.getState().navigation.destination).toBe('')
    })
  })

  describe('未知函数', () => {
    it('应该返回空数组', () => {
      const changes = manager.applyCommand('unknown_function', {})

      expect(changes).toHaveLength(0)
    })
  })

  describe('边界情况', () => {
    it('温度变更应该正确显示旧值和新值', () => {
      manager.applyCommand('control_ac', { action: 'set_temperature', temperature: 20 })
      const changes = manager.applyCommand('control_ac', {
        action: 'set_temperature',
        temperature: 24,
      })

      expect(changes[0]).toEqual({ field: '空调温度', from: '20°C', to: '24°C' })
    })

    it('车窗开度相同时不应记录变更', () => {
      manager.applyCommand('control_window', { action: 'open', position: 'front_left' })
      const changes = manager.applyCommand('control_window', {
        action: 'set_position',
        position: 'front_left',
        open_percentage: 100,
      })

      expect(changes).toHaveLength(0)
    })
  })
})
