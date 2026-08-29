/** Combines seed TSV chunks into one catalog string. */
import { SEED_CHUNK_0 } from "./seed-chunk-0";
import { SEED_CHUNK_1 } from "./seed-chunk-1";
import { SEED_CHUNK_2 } from "./seed-chunk-2";
import { SEED_CHUNK_3 } from "./seed-chunk-3";
import { SEED_CHUNK_4 } from "./seed-chunk-4";

export const CIRCLE_ADD_SEED_TSV = [SEED_CHUNK_0, SEED_CHUNK_1, SEED_CHUNK_2, SEED_CHUNK_3, SEED_CHUNK_4].join("\n");
