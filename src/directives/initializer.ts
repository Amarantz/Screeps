import { Directive } from "./Directive";
import DirectiveHarvest from './resource/harvest';
import DirectiveBootstrap  from "./situational/bootstrap";
import DirectiveOutpost from "./colony/outpost";
import { DirectiveGuard } from "./defense/guard";
import { DirectiveOutpostDefense } from "./defense/outpostDefense";
import { DirectiveInvasionDefense } from "./defense/invasionDefense";
import { DirectiveTargetSiege } from "./targeting/siegeTarget";
import { DirectiveDismantle } from "./targeting/dismantle";
import { DirectiveHaul } from "./resource/haul";

export const DirectiveWrapper = (flag: Flag): Directive | undefined => {
    switch(flag.color){
        case COLOR_YELLOW:
            switch(flag.secondaryColor){
                case COLOR_YELLOW:
                    return new DirectiveHarvest(flag);
                case COLOR_BLUE:
                    return new DirectiveHaul(flag);
            }
        case COLOR_ORANGE:
            switch(flag.secondaryColor){
                case COLOR_ORANGE:
                    return new DirectiveBootstrap(flag);
            }
        case COLOR_PURPLE:
            switch(flag.secondaryColor){
                case COLOR_PURPLE:
                    return new DirectiveOutpost(flag);
            }
        		// Defensive combat directives =================================================================================
		case COLOR_BLUE:
			switch (flag.secondaryColor) {
				case COLOR_BLUE:
					return new DirectiveGuard(flag);
				case COLOR_RED:
					return new DirectiveOutpostDefense(flag);
				case COLOR_PURPLE:
					return new DirectiveInvasionDefense(flag);
			}
            break;
        		// Targeting colors ============================================================================================
		case COLOR_GREY:
			switch (flag.secondaryColor) {
				case COLOR_ORANGE:
					return new DirectiveTargetSiege(flag);
				case COLOR_YELLOW:
					return new DirectiveDismantle(flag);
			}
			break;
    }
}
