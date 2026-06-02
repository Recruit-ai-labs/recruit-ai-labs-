export const siteConfig = {
  name: "RecruitAI",
  description: "AI-Powered Recruitment Platform powered by NVIDIA NIM",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og.jpg",
  links: {
    twitter: "https://twitter.com/recruitai",
    github: "https://github.com/recruitai",
  },
}

export const appConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  maxCandidatesPerBatch: 50,
  defaultTemperature: 0.3,
  maxTokensLLM: 4096,
}
