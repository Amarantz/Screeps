export interface BodySetup {
    pattern: BodyPartConstant[];
    sizeLimit: number;
    prefix: BodyPartConstant[];
    suffix: BodyPartConstant[];
    proportionalPrefixSuffix: boolean;
    ordered: boolean;
}

export const bodyCost = (bodyparts: BodyPartConstant[]): number => {
    return _.sum(bodyparts, part => BODYPART_COST[part]);
};

export const patternCost = (setup: CreepSetup): number => {
    return bodyCost(setup.bodySetup.pattern);
}

export class CreepSetup {
    role: string;
    bodySetup: BodySetup;

    constructor(roleName:string, bodySetup = {}) {
        this.role = roleName;
        _.defaults(bodySetup, {
            pattern: [],
            sizeLimit: Infinity,
            prefix: [],
            suffix: [],
            proportinalPrefixSuffix: false,
            ordered: true,
        });
        this.bodySetup = bodySetup as BodySetup;
    }

    generateBody(avalilableEnery: number): BodyPartConstant[] {
        let patternCost, patternLenght, numRepeats: number;
        const prefix = this.bodySetup.prefix;
        const suffix = this.bodySetup.suffix;
        let body: BodyPartConstant[] = [];
        if(this.bodySetup.proportionalPrefixSuffix){
            patternCost = bodyCost(prefix) + bodyCost(this.bodySetup.pattern) + bodyCost(suffix);
            patternLenght = prefix.length + this.bodySetup.pattern.length + suffix.length;
            const energLimit = Math.floor(avalilableEnery/ patternCost);
            const maxPartLimit = Math.floor(MAX_CREEP_SIZE / patternLenght);
            numRepeats = Math.min(energLimit, maxPartLimit, this.bodySetup.sizeLimit);
        } else {
            const extraCost = bodyCost(prefix) + bodyCost(suffix);
            patternCost = bodyCost(this.bodySetup.pattern);
			patternLenght = this.bodySetup.pattern.length;
			const energyLimit = Math.floor((avalilableEnery - extraCost) / patternCost);
			const maxPartLimit = Math.floor((MAX_CREEP_SIZE - prefix.length - suffix.length) / patternLenght);
			numRepeats = Math.min(energyLimit, maxPartLimit, this.bodySetup.sizeLimit);
        }

        		// build the body
		if (this.bodySetup.proportionalPrefixSuffix) { // add the prefix
			for (let i = 0; i < numRepeats; i++) {
				body = body.concat(prefix);
			}
		} else {
			body = body = body.concat(prefix);
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
}