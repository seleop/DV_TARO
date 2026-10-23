process.env.DATA_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");

process.env.AI_PROVIDER ??= "mock";
process.env.JEOMBOM_ENABLED = "true";
