import { Card } from "./cards";

export interface VillagePillagePlayer extends Player {
    // any information you add on each result['players']
    bank: string;
    stockpile: string;
    left: Card | null;
    right: Card | null;
}

export interface VillagePillageGamedatas extends Gamedatas<VillagePillagePlayer> {
    // Add here variables you set up in getAllDatas
    hand: Card[];
    shop: Card[];
    test: any;
}

export interface VillagePillageGame {
    // @ts-ignore
    animationManager: BgaAnimations.Manager;

    bga: Bga<VillagePillageGamedatas>;
}