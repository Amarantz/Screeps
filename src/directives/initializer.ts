import Directive from "./Directive";

export default const DirectiveWrapper = (flag: Flag): Directive | undefined => {
    switch(flag.color){
        case COLOR_YELLOW:
            switch(flag.secondaryColor){
                case COLOR_YELLOW:
                    return new DirectiveHarvest(flag);
            }
    }
}
