import { getUsername } from "utils/utils";

/**
 * Your username - you shouldn't need to change this.
 */
export const MY_USERNAME: string = getUsername();

export const USE_TRY_CATCH: boolean = true

/**
 * Limit how many rooms you can claim (for any shard)
 */
export const MAX_OWNED_ROOMS = Infinity;

/**
 * If you are running on shard3 (CPU limit 20), only claim this many rooms
 */
export const SHARD3_MAX_OWNED_ROOMS = 3;
