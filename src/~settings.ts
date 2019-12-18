import { getUsername, onPublicsServer } from "utils/utils";

/**
 * Your username - you shouldn't need to change this.
 */
export const MY_USERNAME: string = getUsername();


/**
 * Limit how many rooms you can claim (for any shard)
 */
export const MAX_OWNED_ROOMS = Infinity;


/**
 * The global Overmind object will be re-instantiated after this many ticks. In the meantime, refresh() is used.
 */
export const NEW_COBAL_INTERVAL = onPublicsServer() ? 20 : 5;
