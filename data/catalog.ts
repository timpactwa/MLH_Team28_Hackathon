import { z } from "zod";
import { CatalogItem } from "@/lib/schema";
import raw from "./catalog.json";

/** The furniture catalog, validated against the schema at import time. */
export const catalog: CatalogItem[] = z.array(CatalogItem).parse(raw);

export const catalogById: ReadonlyMap<string, CatalogItem> = new Map(catalog.map((item) => [item.id, item]));
