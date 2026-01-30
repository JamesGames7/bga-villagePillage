interface VillagePillagePlayer extends Player {
    // cards: Card[]; // any information you add on each result['players']
}

interface VillagePillageGamedatas extends Gamedatas<VillagePillagePlayer> {
    // Add here variables you set up in getAllDatas
    hand: {name: string, type: string, id: number}[];
}

interface VillagePillageGame {
    // @ts-ignore
    animationManager: BgaAnimations.Manager;
}