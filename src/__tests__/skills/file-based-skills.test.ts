/**
 * 文件系统级 Skills 测试
 *
 * 测试 SkillLoader 能正确加载所有 Skills 并验证元数据解析
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { SkillLoader, FileBasedSkill } from '../../skills/v2/skill-loader.js'
import { Domain } from '../../types/domain.js'

describe('FileBasedSkills', () => {
  let skillLoader: SkillLoader
  let loadedSkills: FileBasedSkill[]

  beforeAll(async () => {
    skillLoader = new SkillLoader('skills')
    loadedSkills = await skillLoader.loadAllSkills()
  })

  describe('Skill Loading', () => {
    it('should load all 4 skills', () => {
      expect(loadedSkills).toHaveLength(4)
    })

    it('should load skills from correct directories', () => {
      const skillIds = loadedSkills.map(s => s.id).sort()
      expect(skillIds).toEqual(['chat', 'music', 'navigation', 'vehicle_control'])
    })
  })

  describe('vehicle_control Skill', () => {
    let vehicleSkill: FileBasedSkill | undefined

    beforeAll(() => {
      vehicleSkill = loadedSkills.find(s => s.id === 'vehicle_control')
    })

    it('should have correct metadata', () => {
      expect(vehicleSkill).toBeDefined()
      expect(vehicleSkill?.name).toBe('车辆控制')
      expect(vehicleSkill?.domain).toBe(Domain.VEHICLE_CONTROL)
      expect(vehicleSkill?.metadata.version).toBe('1.0.0')
    })

    it('should have all 6 capabilities defined', () => {
      const capabilities = vehicleSkill?.capabilities ?? []
      const capNames = capabilities.map(c => c.name).sort()
      expect(capNames).toEqual([
        'ac_control',
        'light_control',
        'seat_control',
        'trunk_control',
        'window_control',
        'wiper_control',
      ])
    })

    it('should have ac_control capability with correct slots', () => {
      const acControl = vehicleSkill?.capabilities?.find(c => c.name === 'ac_control')
      expect(acControl).toBeDefined()
      expect(acControl?.description).toContain('空调控制')
      expect(acControl?.slots).toBeDefined()
      expect(acControl?.slots?.length).toBeGreaterThan(0)

      // 验证 action 槽位
      const actionSlot = acControl?.slots?.find(s => s.name === 'action')
      expect(actionSlot?.type).toBe('enum')
      expect(actionSlot?.required).toBe(true)
      expect(actionSlot?.enumValues).toContain('turn_on')
      expect(actionSlot?.enumValues).toContain('turn_off')
    })

    it('should have examples defined', () => {
      const acControl = vehicleSkill?.capabilities?.find(c => c.name === 'ac_control')
      expect(acControl?.examples).toBeDefined()
      expect(acControl?.examples?.length).toBeGreaterThan(0)
      expect(acControl?.examples).toContain('打开空调')
    })

    it('should have trigger keywords', () => {
      const keywords = vehicleSkill?.capabilities
        ?.flatMap(c => c.keywords ?? [])
      expect(keywords).toContain('空调')
      expect(keywords).toContain('车窗')
    })
  })

  describe('music Skill', () => {
    let musicSkill: FileBasedSkill | undefined

    beforeAll(() => {
      musicSkill = loadedSkills.find(s => s.id === 'music')
    })

    it('should have correct metadata', () => {
      expect(musicSkill).toBeDefined()
      expect(musicSkill?.name).toBe('音乐控制')
      expect(musicSkill?.domain).toBe(Domain.MUSIC)
    })

    it('should have all 5 capabilities defined', () => {
      const capabilities = musicSkill?.capabilities ?? []
      const capNames = capabilities.map(c => c.name).sort()
      expect(capNames).toEqual([
        'next_previous',
        'play_mode',
        'play_pause',
        'search_and_play',
        'volume_control',
      ])
    })

    it('should have search_and_play capability with optional slots', () => {
      const searchAndPlay = musicSkill?.capabilities?.find(c => c.name === 'search_and_play')
      expect(searchAndPlay).toBeDefined()

      const songSlot = searchAndPlay?.slots?.find(s => s.name === 'song')
      expect(songSlot?.required).toBe(false)

      const artistSlot = searchAndPlay?.slots?.find(s => s.name === 'artist')
      expect(artistSlot?.required).toBe(false)

      const genreSlot = searchAndPlay?.slots?.find(s => s.name === 'genre')
      expect(genreSlot?.type).toBe('enum')
      expect(genreSlot?.enumValues).toContain('pop')
      expect(genreSlot?.enumValues).toContain('rock')
    })
  })

  describe('navigation Skill', () => {
    let navigationSkill: FileBasedSkill | undefined

    beforeAll(() => {
      navigationSkill = loadedSkills.find(s => s.id === 'navigation')
    })

    it('should have correct metadata', () => {
      expect(navigationSkill).toBeDefined()
      expect(navigationSkill?.name).toBe('导航控制')
      expect(navigationSkill?.domain).toBe(Domain.NAVIGATION)
    })

    it('should have all 4 capabilities defined', () => {
      const capabilities = navigationSkill?.capabilities ?? []
      const capNames = capabilities.map(c => c.name).sort()
      expect(capNames).toEqual([
        'cancel_navigation',
        'get_status',
        'route_preference',
        'set_destination',
      ])
    })

    it('should have set_destination with required destination slot', () => {
      const setDest = navigationSkill?.capabilities?.find(c => c.name === 'set_destination')
      expect(setDest).toBeDefined()

      const destSlot = setDest?.slots?.find(s => s.name === 'destination')
      expect(destSlot?.required).toBe(true)
      expect(destSlot?.type).toBe('string')

      const citySlot = setDest?.slots?.find(s => s.name === 'city')
      expect(citySlot?.required).toBe(false)
    })

    it('should have route_preference with enum preference', () => {
      const routePref = navigationSkill?.capabilities?.find(c => c.name === 'route_preference')
      expect(routePref).toBeDefined()

      const prefSlot = routePref?.slots?.find(s => s.name === 'preference')
      expect(prefSlot?.type).toBe('enum')
      expect(prefSlot?.enumValues).toContain('highway')
      expect(prefSlot?.enumValues).toContain('avoid_toll')
    })
  })

  describe('chat Skill', () => {
    let chatSkill: FileBasedSkill | undefined

    beforeAll(() => {
      chatSkill = loadedSkills.find(s => s.id === 'chat')
    })

    it('should have correct metadata', () => {
      expect(chatSkill).toBeDefined()
      expect(chatSkill?.name).toBe('智能问答')
      expect(chatSkill?.domain).toBe(Domain.CHAT)
    })

    it('should have all capabilities defined', () => {
      const capabilities = chatSkill?.capabilities ?? []
      const capNames = capabilities.map(c => c.name).sort()
      expect(capNames).toEqual([
        'calculator',
        'system_info',
        'vehicle_qa',
        'weather_query',
      ])
    })

    it('should have vehicle_qa with required question slot', () => {
      const vehicleQa = chatSkill?.capabilities?.find(c => c.name === 'vehicle_qa')
      expect(vehicleQa).toBeDefined()

      const questionSlot = vehicleQa?.slots?.find(s => s.name === 'question')
      expect(questionSlot?.required).toBe(true)
    })
  })

  describe('SKILL.md Instructions', () => {
    it('should load instructions for all skills', async () => {
      for (const skill of loadedSkills) {
        const instructions = await skillLoader.loadInstructions(skill.id)
        expect(instructions).toBeDefined()
        expect(instructions?.content.length).toBeGreaterThan(0)
        expect(instructions?.content).toContain('# ')
      }
    })

    it('should have structured capability sections in instructions', async () => {
      const vehicleInstructions = await skillLoader.loadInstructions('vehicle_control')
      expect(vehicleInstructions?.content).toContain('ac_control')
      expect(vehicleInstructions?.content).toContain('空调控制')

      const musicInstructions = await skillLoader.loadInstructions('music')
      expect(musicInstructions?.content).toContain('play_pause')
    })
  })

  describe('FileBasedSkill Methods', () => {
    it('should have getInstructionsObject method', async () => {
      const skill = loadedSkills[0]
      expect(skill.getInstructionsObject).toBeDefined()
    })
  })

  describe('Query Examples', () => {
    it('should have examples files for all skills', async () => {
      for (const skill of loadedSkills) {
        const examples = await skillLoader.loadExamples(skill.id)
        expect(examples).toBeDefined()
        expect(examples.length).toBeGreaterThan(0)
      }
    })

    it('should have valid example format', async () => {
      const vehicleExamples = await skillLoader.loadExamples('vehicle_control')
      expect(vehicleExamples.some(e => e.includes('空调'))).toBe(true)
      expect(vehicleExamples.some(e => e.includes('车窗'))).toBe(true)

      const musicExamples = await skillLoader.loadExamples('music')
      expect(musicExamples.some(e => e.includes('播放'))).toBe(true)
    })
  })

  describe('Priority and Enabled Status', () => {
    it('should have valid priority values', () => {
      for (const skill of loadedSkills) {
        const priority = skill.metadata.priority as number | undefined
        if (priority !== undefined) {
          expect(priority).toBeGreaterThanOrEqual(1)
          expect(priority).toBeLessThanOrEqual(100)
        }
      }
    })

    it('should be enabled by default', () => {
      for (const skill of loadedSkills) {
        const enabled = (skill.metadata.enabled as boolean | undefined) ?? true
        expect(enabled).toBe(true)
      }
    })
  })
})
