import { generateSlotContent } from '../services/bedrock';
import type {
  GenerateSlotInput, GenerateSlotRetryInput, SlotResult, GenerativeSlotInput,
} from '../types';

type Input = GenerateSlotInput | GenerateSlotRetryInput;

export const handler = async (event: Input): Promise<SlotResult | { slots: SlotResult[] }> => {

  // ── Retry mode: regenerate only failed slots ──────────────────────────────
  if ('retryMode' in event && event.retryMode) {
    const { failedSlots, slots: allSlots, context, validationReport, generationId } = event;

    console.info('[generateSlot] retry mode', {
      generationId,
      failedCount: failedSlots.length,
    });

    const updatedSlots = [...allSlots];

    for (const failed of failedSlots) {
      const slotDef = context.generativeSlots.find(s => s.slotId === failed.slotId);
      if (!slotDef) continue;

      const augmentedInstruction: GenerativeSlotInput = {
        ...slotDef,
        instruction: `${slotDef.instruction}\n\n[FEEDBACK VALIDAZIONE PRECEDENTE]\n${failed.feedback}\nCorreggi questi problemi specifici nel nuovo output.`,
      };

      console.info('[generateSlot] retrying slot', { slotId: failed.slotId });

      const content = await generateSlotContent(
        augmentedInstruction,
        {
          companyName:    context.company.name,
          sector:         context.company.sector,
          employeesRange: context.company.employees_range,
          toolName:       context.system.tool_name,
          vendor:         context.system.vendor,
          purpose:        context.system.purpose,
          role:           context.system.role,
          gapDescription: context.gap.description,
          whatToDo:       context.gap.what_to_do,
        },
        slotDef.articleContext,
        context.modelId,
      );

      const idx = updatedSlots.findIndex(s => s.slotId === failed.slotId);
      if (idx >= 0) {
        updatedSlots[idx] = { slotId: failed.slotId, content };
      } else {
        updatedSlots.push({ slotId: failed.slotId, content });
      }
    }

    return { slots: updatedSlots };
  }

  // ── Normal mode: generate a single slot ───────────────────────────────────
  const { slot, context, generationId } = event as GenerateSlotInput;

  console.info('[generateSlot] generating slot', { generationId, slotId: slot.slotId });

  const content = await generateSlotContent(
    slot,
    {
      companyName:    context.company.name,
      sector:         context.company.sector,
      employeesRange: context.company.employees_range,
      toolName:       context.system.tool_name,
      vendor:         context.system.vendor,
      purpose:        context.system.purpose,
      role:           context.system.role,
      gapDescription: context.gap.description,
      whatToDo:       context.gap.what_to_do,
    },
    slot.articleContext,
    context.modelId,
  );

  console.info('[generateSlot] slot done', { generationId, slotId: slot.slotId });
  return { slotId: slot.slotId, content };
};
