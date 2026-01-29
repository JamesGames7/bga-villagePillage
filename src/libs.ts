import type { BgaAnimations as BgaAnimationsType } from "../bga-animations";
import type { BgaCards as BgaCardsType } from "../bga-cards";

const BgaAnimations: typeof BgaAnimationsType = await globalThis.importEsmLib('bga-animations', '1.x');
const BgaCards: typeof BgaCardsType = await globalThis.importEsmLib('bga-cards', '1.x');

export { BgaAnimations, BgaCards };