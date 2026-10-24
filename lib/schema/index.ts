import { z } from "zod";

export * from "./room";
export * from "./furniture";
export * from "./needs";
export * from "./check";

/** JSON Schema for a contract, for model structured output (`responseJsonSchema`). */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
}
