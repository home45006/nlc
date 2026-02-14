import { describe, it, expect } from 'vitest'
import {
  AC_MODE_MAP,
  MUSIC_MODE_MAP,
  ROUTE_PREFERENCE_MAP,
  WIPER_SPEED_MAP,
  MODE_MAP,
} from '../constants.js'

describe('constants', () => {
  describe('AC_MODE_MAP', () => {
    it('应该包含所有空调模式', () => {
      expect(AC_MODE_MAP).toHaveProperty('cool', '制冷')
      expect(AC_MODE_MAP).toHaveProperty('heat', '制热')
      expect(AC_MODE_MAP).toHaveProperty('auto', '自动')
      expect(AC_MODE_MAP).toHaveProperty('ventilation', '通风')
    })

    it('应该有4个模式', () => {
      expect(Object.keys(AC_MODE_MAP)).toHaveLength(4)
    })
  })

  describe('MUSIC_MODE_MAP', () => {
    it('应该包含所有音乐播放模式', () => {
      expect(MUSIC_MODE_MAP).toHaveProperty('sequential', '顺序播放')
      expect(MUSIC_MODE_MAP).toHaveProperty('shuffle', '随机播放')
      expect(MUSIC_MODE_MAP).toHaveProperty('repeat_one', '单曲循环')
    })

    it('应该有3个模式', () => {
      expect(Object.keys(MUSIC_MODE_MAP)).toHaveLength(3)
    })
  })

  describe('ROUTE_PREFERENCE_MAP', () => {
    it('应该包含所有路线偏好', () => {
      expect(ROUTE_PREFERENCE_MAP).toHaveProperty('fastest', '最快')
      expect(ROUTE_PREFERENCE_MAP).toHaveProperty('shortest', '最短')
      expect(ROUTE_PREFERENCE_MAP).toHaveProperty('no_highway', '不走高速')
    })

    it('应该有3个偏好', () => {
      expect(Object.keys(ROUTE_PREFERENCE_MAP)).toHaveLength(3)
    })
  })

  describe('WIPER_SPEED_MAP', () => {
    it('应该包含所有雨刮速度', () => {
      expect(WIPER_SPEED_MAP).toHaveProperty('low', '低速')
      expect(WIPER_SPEED_MAP).toHaveProperty('medium', '中速')
      expect(WIPER_SPEED_MAP).toHaveProperty('high', '高速')
    })

    it('应该有3个速度', () => {
      expect(Object.keys(WIPER_SPEED_MAP)).toHaveLength(3)
    })
  })

  describe('MODE_MAP', () => {
    it('应该合并所有模式映射', () => {
      // 空调模式
      expect(MODE_MAP).toHaveProperty('cool', '制冷')
      expect(MODE_MAP).toHaveProperty('heat', '制热')

      // 音乐模式
      expect(MODE_MAP).toHaveProperty('sequential', '顺序播放')
      expect(MODE_MAP).toHaveProperty('shuffle', '随机播放')

      // 路线偏好
      expect(MODE_MAP).toHaveProperty('fastest', '最快')
      expect(MODE_MAP).toHaveProperty('shortest', '最短')

      // 雨刮速度
      expect(MODE_MAP).toHaveProperty('low', '低速')
      expect(MODE_MAP).toHaveProperty('high', '高速')
    })

    it('应该包含所有映射的总数', () => {
      const totalCount = Object.keys(AC_MODE_MAP).length
        + Object.keys(MUSIC_MODE_MAP).length
        + Object.keys(ROUTE_PREFERENCE_MAP).length
        + Object.keys(WIPER_SPEED_MAP).length

      expect(Object.keys(MODE_MAP)).toHaveLength(totalCount)
    })
  })
})
