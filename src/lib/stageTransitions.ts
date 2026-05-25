// Feature: print-os — Stage transition pure logic
import { JobStage, STAGE_ORDER } from '../types/index'

export { STAGE_ORDER }

export function advanceStageLogic(current: JobStage): JobStage {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1) throw new Error(`Unknown stage: ${current}`)
  if (idx === STAGE_ORDER.length - 1) throw new Error(`Already at final stage: ${current}`)
  return STAGE_ORDER[idx + 1]
}

export function isBackwardTransition(from: JobStage, to: JobStage): boolean {
  return STAGE_ORDER.indexOf(to) < STAGE_ORDER.indexOf(from)
}

export function getStageIndex(stage: JobStage): number {
  return STAGE_ORDER.indexOf(stage)
}
