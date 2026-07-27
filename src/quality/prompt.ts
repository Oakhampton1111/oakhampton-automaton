import { createHash } from "node:crypto";
import type { PromptTemplateVersion } from "./types.js";
export function buildQualityPrompt(template:PromptTemplateVersion,taskData:unknown):string { return template.stablePrefix+"\n\n[UNTRUSTED_TASK_DATA]\n"+JSON.stringify(taskData)+"\n[/UNTRUSTED_TASK_DATA]"; }
export function promptCacheKey(template:PromptTemplateVersion,taskData:unknown):string { return createHash("sha256").update(template.id+":"+template.version+":"+JSON.stringify(taskData)).digest("hex"); }
