import Directive from "./Directive";
import DirectiveHarvest from './resource/harvest';
import DirectiveBootstrap  from "./situational/bootstrap";

export const DirectiveWrapper = (flag: Flag): Directive | undefined => {
    switch(flag.color){
        case COLOR_YELLOW:
            switch(flag.secondaryColor){
                case COLOR_YELLOW:
                    return new DirectiveHarvest(flag);
            }
        case COLOR_ORANGE:
            switch(flag.secondaryColor){
                case COLOR_ORANGE:
                    return new DirectiveBootstrap(flag);
            }
    }
}
