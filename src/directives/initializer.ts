export function DirectiveWrapper(flag: Flag): Directive | undefined {

	switch (flag.color) {

		// Colony directives ===========================================================================================
		case COLOR_PURPLE:
			switch (flag.secondaryColor) {
				case COLOR_PURPLE:
					return new DirectiveOutpost(flag);
				case COLOR_YELLOW:
					return new DirectiveSKOutpost(flag);
				case COLOR_WHITE:
					return new DirectiveIncubate(flag);
				case COLOR_GREY:
					return new DirectiveColonize(flag);
				case COLOR_ORANGE:
					return new DirectiveClearRoom(flag);
			}
            break;

        // Situational directives ======================================================================================
		case COLOR_ORANGE:
			switch (flag.secondaryColor) {
				case COLOR_ORANGE:
					return new DirectiveBootstrap(flag);
				case COLOR_BLUE:
					return new DirectiveNukeResponse(flag);
			}
            break;

        		// Resource directives =========================================================================================
		case COLOR_YELLOW:
			switch (flag.secondaryColor) {
				case COLOR_YELLOW:
					return new DirectiveHarvest(flag);
				case COLOR_CYAN:
					return new DirectiveExtract(flag);
				case COLOR_BLUE:
					return new DirectiveHaul(flag);
			}
			break;
    }
}
