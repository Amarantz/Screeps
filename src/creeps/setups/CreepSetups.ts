import Base from '../../Base';


export interface BodySetup {
    pattern: BodyPartConstant[];
    sizeLimit: number;
    prefix: BodyPartConstant[];
    suffix: BodyPartConstant[];
    proportionalPrefixSuffix: boolean;
    ordered: boolean;
}

export function bodyCost(bodyparts: BodyPartConstant[]): number {
    return _.sum(bodyparts, part => BODYPART_COST[part]);
}

export function partternCost(setup: CreepSetup):number {
    return bodyCost(setup.bodySetup.pattern);
}

export class CreepSetup {
    role: string;
    bodySetup: BodySetup;

    constructor(roleName: string, bodySetup = {}) {
        this.role = roleName;
        _.defaults(bodySetup,  {
            pattern: [],
            sizeLimit: Infinity,
            prefix: [],
            suffix: [],
            proportionalPrefixSuffix: false,
            ordered: true,
		});
		this.bodySetup = bodySetup as BodySetup;
    }

 	/* Generate the largest body of a given pattern that is producable from a room,
	 * subject to limitations from maxRepeats */
	generateBody(availableEnergy: number): BodyPartConstant[] {
		let patternCost, patternLength, numRepeats: number;
		const prefix = this.bodySetup.prefix || [];
		const suffix = this.bodySetup.suffix || [];
		let body: BodyPartConstant[] = [];
		// calculate repetitions
		if (this.bodySetup.proportionalPrefixSuffix) { // if prefix and suffix are to be kept proportional to body size
			patternCost = bodyCost(prefix) + bodyCost(this.bodySetup.pattern) + bodyCost(suffix);
			patternLength = prefix.length + this.bodySetup.pattern.length + suffix.length;
			const energyLimit = Math.floor(availableEnergy / patternCost); // max number of repeats room can produce
			const maxPartLimit = Math.floor(MAX_CREEP_SIZE / patternLength); // max repetitions resulting in <50 parts
			numRepeats = Math.min(energyLimit, maxPartLimit, this.bodySetup.sizeLimit);
		} else { // if prefix and suffix don't scale
			const extraCost = bodyCost(prefix) + bodyCost(suffix);
			patternCost = bodyCost(this.bodySetup.pattern);
			patternLength = this.bodySetup.pattern.length;
			const energyLimit = Math.floor((availableEnergy - extraCost) / patternCost);
			const maxPartLimit = Math.floor((MAX_CREEP_SIZE - prefix.length - suffix.length) / patternLength);
			numRepeats = Math.min(energyLimit, maxPartLimit, this.bodySetup.sizeLimit);
		}
		// build the body
		if (this.bodySetup.proportionalPrefixSuffix) { // add the prefix
			for (let i = 0; i < numRepeats; i++) {
				body = body.concat(prefix);
			}
		} else {
			body = body.concat(prefix);
		}

		if (this.bodySetup.ordered) { // repeated body pattern
			for (const part of this.bodySetup.pattern) {
				for (let i = 0; i < numRepeats; i++) {
					body.push(part);
				}
			}
		} else {
			for (let i = 0; i < numRepeats; i++) {
				body = body.concat(this.bodySetup.pattern);
			}
		}

		if (this.bodySetup.proportionalPrefixSuffix) { // add the suffix
			for (let i = 0; i < numRepeats; i++) {
				body = body.concat(suffix);
			}
		} else {
			body = body.concat(suffix);
		}
		// return it
		return body;
	}

	getBodyPotential(partType: BodyPartConstant, base: Base): number {
		// let energyCapacity = Math.max(colony.room.energyCapacityAvailable,
		// 							  colony.incubator ? colony.incubator.room.energyCapacityAvailable : 0);
		let energyCapacity = base.room.energyCapacityAvailable;
		// if (base.spawnGroup) {
		// 	const colonies = _.compact(_.map(base.spawnGroup.memory.bases,
		// 								   name => global.Cobal.bases[name as string])) as Base[];
		// 	energyCapacity = _.max(_.map(colonies, colony => colony.room.energyCapacityAvailable));
		// }
		const body = this.generateBody(energyCapacity);
		return _.filter(body, (part: BodyPartConstant) => part == partType).length;
	}

}
