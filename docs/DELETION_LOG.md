# Code Deletion Log

## [2026-02-17] Refactor Session - Skill Architecture Cleanup

### Unused Exports Removed

- `VehicleControlIntent` (src/types/domain.ts) - 未被任何代码引用的意图常量
- `MusicIntent` (src/types/domain.ts) - 未被任何代码引用的意图常量
- `NavigationIntent` (src/types/domain.ts) - 未被任何代码引用的意图常量

**原因**: 系统现在使用 Skill 架构进行意图识别，不再使用硬编码的意图常量。

### Legacy Code Identified (NOT REMOVED)

以下旧架构代码仅被测试文件使用，但保留以确保向后兼容和测试覆盖:

| 文件 | 状态 | 替代方案 |
|------|------|----------|
| `src/dialog/dialog-manager.ts` | 保留 | 使用 `NewDialogManager` |
| `src/llm/orchestrator.ts` | 保留 | 使用 `FileBasedSkillOrchestrator` |
| `src/llm/prompt-builder.ts` | 保留 | 新架构不需要 |
| `src/llm/function-registry.ts` | 保留 | 新架构使用 Skill capabilities |

### Unused Dependencies (FALSE POSITIVES)

以下依赖被 depcheck 标记为未使用，但实际上是必需的:

- `@vitest/coverage-v8` - 用于 `npm run test:coverage`
- `typescript` - 核心开发依赖，用于类型检查和编译

### Impact

- 文件删除: 0
- 导出删除: 3
- 代码行数删除: ~20

### Testing

- 所有单元测试通过: 324 tests / 19 files
- TypeScript 编译: 通过
- 无运行时错误

### Recommendations for Future Cleanup

1. **Phase 2 - 删除旧架构测试文件**:
   - `src/__tests__/dialog/dialog-manager.test.ts`
   - `src/__tests__/llm/orchestrator.test.ts`
   - `src/__tests__/llm/prompt-builder.test.ts`
   - `src/__tests__/llm/function-registry.test.ts`

2. **Phase 3 - 删除旧架构实现**:
   - `src/dialog/dialog-manager.ts`
   - `src/llm/orchestrator.ts`
   - `src/llm/prompt-builder.ts`
   - `src/llm/function-registry.ts`

3. **Phase 4 - 清理旧架构类型**:
   - `src/core/types.ts` 中的 DomainHandler, DomainRouter 等接口

---

**注意**: Phase 2-4 需要在确认新架构完全稳定后再执行。
