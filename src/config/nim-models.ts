export const NIM_MODELS = {
  LLM_70B: "meta/llama-3.1-70b-instruct",
  LLM_405B: "meta/llama-3.1-405b-instruct",
  EMBEDDING_E5: "nvidia/nv-embedqa-e5-v5",
  EMBEDDING_V4: "nvidia/embed-qa-4",
} as const

export const NIM_COSTS = {
  "meta/llama-3.1-405b-instruct": { input: 0.000075, output: 0.0003 },
  "meta/llama-3.1-70b-instruct": { input: 0.000015, output: 0.00006 },
  "nvidia/nv-embedqa-e5-v5": { per_request: 0.0005 },
  "nvidia/embed-qa-4": { per_request: 0.0005 },
} as const

export type NIMModel = keyof typeof NIM_COSTS
