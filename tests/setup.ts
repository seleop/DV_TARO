// 테스트용 환경변수. 실제 키가 아니다.
process.env.DATA_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");

process.env.AI_PROVIDER ??= "mock";
process.env.JEOMBOM_ENABLED ??= "false";
