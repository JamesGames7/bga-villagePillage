import { BgaCards, BgaAnimations } from "./libs";
import { Card } from "./docs/cards";

export class CardsManager extends BgaCards.Manager<Card> {
    constructor (public game: VillagePillageGame) {
        super({
            getId: (card: Card) => card.id,
            setupDiv: (card: Card, div: HTMLElement) => {
                div.dataset.id = card.id.toString();
                div.dataset.type = card.type;
                div.dataset.name = card.name;
            },
            setupFrontDiv: (card: Card, div: HTMLElement) => {
                div.style.backgroundImage = `url(${g_gamethemeurl}img/baseCards.jpg)`;
                div.style.backgroundSize = `700% 400%`;

                div.style.backgroundPositionX = `-${Math.floor(card.id / 4)}00%`;
                div.style.backgroundPositionY = `-${card.id % 4}00%`;

                // TODO update tooltip
                game.bga.gameui.addTooltipHtml(div.id, /*html*/`<strong>Name:</strong> ${card.name}<br><strong>Type:</strong> ${card.type}<br>`)
            },
            setupBackDiv: (card: Card, div: HTMLElement) => {
                div.style.backgroundImage = `url(${g_gamethemeurl}img/baseCards.jpg)`;
                div.style.backgroundSize = `700% 400%`;
                div.style.backgroundPosition = `-600% 0`;
            },
            cardBorderRadius: "4px",

            isCardVisible: () => true,

            animationManager: game.animationManager,
            cardWidth: 200,
            cardHeight: 298
        })
    }
}

export enum Types {
    Raider = "Raider",
    Wall = "Wall",
    Farmer = "Farmer",
    Merchant = "Merchant"
}