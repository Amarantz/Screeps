import { getCacheExpiration } from "../utils/utils";
import { UnaryExpression } from "../../node_modules/@types/estree";

const CACHE_TIMEOUT = 50;
const SHORT_CACHE_TIMEOUT = 10;

export default class $ {
    static structure<T extends Structure> (saver: {ref: string}, key: string, callback: () => T[], timeout: number = CACHE_TIMEOUT): T[] {
        const cachekey = saver.ref+'s'+key;
        if(!_cache.structures[cachekey] || Game.time > _cache.expirations[cachekey]) {
            _cache.structures[cachekey] = callback();
            _cache.expirations[cachekey] = getCacheExpiration(timeout, Math.ceil(timeout/10));
        } else {
            if((_cache.accessed[cachekey] || 0) > Game.time) {
                _cache.structures[cachekey] = _.compact(_.map(_cache.structures[cachekey] || [], s => Game.getObjectById(s.id))) as Structure[]
                _cache.accessed[cachekey] = Game.time;
            }
        }
        return _cache.structures[cachekey] as T[];
    }

    static number(saver: {ref:string}, key:string, callback: () => number, timeout: number = SHORT_CACHE_TIMEOUT): number {
        const cachekey = saver.ref+'#'+key;
        if(!_cache.numbers[cachekey] == undefined || Game.time > _cache.expirations[cachekey]){
            _cache.numbers[cachekey] = callback();
            _cache.expirations[cachekey] = getCacheExpiration(timeout, Math.ceil(timeout/10));
        }
        return _cache.numbers[cachekey];
    }

    static pos(saver: {ref:string}, key:string, callback: () => RoomPosition | undefined, timeout?: number): RoomPosition | undefined {
        const cachekey = saver.ref+'p'+key;
        if(!_cache.roomPostions[cachekey] == undefined || Game.time > _cache.expirations[cachekey]){
            _cache.roomPostions[cachekey] = callback();
            if(!timeout) timeout = CACHE_TIMEOUT;
            _cache.expirations[cachekey] = getCacheExpiration(timeout, Math.ceil(timeout/10))
        }
        return _cache.roomPostions[cachekey];
    }

    static list<T>(saver: {ref:string}, key:string, callback: () => T[], timeout: number = CACHE_TIMEOUT) {
        const cachekey = saver.ref+'l'+key;
        if(!_cache.lists[cachekey] == undefined || Game.time > _cache.expirations[cachekey]){
            _cache.lists[cachekey] = callback();
            _cache.expirations[cachekey] = getCacheExpiration(timeout, Math.ceil(timeout/10));
        }
        return _cache.lists[cachekey];
    }

    static costMatrix(saver: {ref:string}, key:string, callback: () => CostMatrix, timeout:number = SHORT_CACHE_TIMEOUT): CostMatrix {
        const cachekey = saver.ref+'m'+key;
        if(!_cache.costMatrix[cachekey] == undefined || Game.time > _cache.expirations[cachekey]){
            _cache.costMatrix[cachekey] = callback();
            _cache.expirations[cachekey] = getCacheExpiration(timeout, Math.ceil(timeout/10))
        }
        return _cache.costMatrix[cachekey];
    }

    static costMatrixRecall(roomName: string, key:string ): CostMatrix | undefined {
        const cachekey = roomName + ':' + key;
        return _cache.costMatrix[cachekey];
    }

    static set<T extends HasRef, K extends keyof T>(thing: T, key: K, callback: () => (T[K] & undefined | HasID | HasID[] ), timeout:number = CACHE_TIMEOUT): void {
        const cachekey = thing.ref + '$' + key;
        if(!_cache.things[cachekey] || Game.time > _cache.expirations[cachekey]){
            _cache.things[cachekey] = callback();
            _cache.expirations[cachekey] = getCacheExpiration(timeout, Math.ceil(timeout/10));
        } else {
            if((_cache.accessed[cachekey] || 0) < Game.time) {
                if(_.isArray(_cache.things[cachekey])){
                    _cache.things[cachekey] = _.compact(_.map(_cache.things[cachekey] as HasID[],
                        s => Game.getObjectById(s.id))) as HasID[]
                }
            }
        }
    }
}
