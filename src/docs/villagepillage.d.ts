interface VillagePillagePlayer extends Player {
    // any information you add on each result['players']
    bank: string;
    stockpile: string;
}

interface VillagePillageGamedatas extends Gamedatas<VillagePillagePlayer> {
    // Add here variables you set up in getAllDatas
    hand: {name: string, type: string, id: number}[];
    shop: {name: string, type: string, id: number}[];
}

interface VillagePillageGame {
    // @ts-ignore
    animationManager: BgaAnimations.Manager;

    bga: Bga<VillagePillageGamedatas>;
}