import { CardsManager } from "./cards";
import { BgaCards, BgaAnimations } from "./libs";
import { Card } from "./docs/cards";
import { Types } from "./cards";

export class Game implements VillagePillageGame {
    // @ts-ignore
    public animationManager: BgaAnimations.Manager = new BgaAnimations.Manager();

    public cardManager: CardsManager = new CardsManager(this);

    public bga: Bga<VillagePillageGamedatas>;
    private gamedatas: VillagePillageGamedatas;


    constructor(bga: Bga<VillagePillageGamedatas>) {
        this.bga = bga;
    }
    
    
    public setup(gamedatas: VillagePillageGamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();

        // @ts-ignore
        let playerOrder: number[] = gamedatas.playerorder;
        while (gamedatas.playerorder[0] != this.bga.players.getCurrentPlayerId()) {
            playerOrder.push(playerOrder.shift());
        }

        playerOrder.forEach(id => {
            let info: VillagePillagePlayer = gamedatas.players[id];

            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/`
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}</div>
                    <div id="player_contents_${info.id}" class="player_contents">
                        <div id="bank_${info.id}" class="bank"></div>
                        <div id="test_card_${info.id}" class="test"></div>
                    </div>
                </div>
            `)
            for (let i = 0; i < 5; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_bank_${info.id}_${i}" class="turnip turnip_${i}"></div>`);
            }
            for (let i = 0; i < 3; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="relic_bank_${info.id}_${i}" class="relic relic_${i}"></div>`);
            }
        })
    } 

    public onEnteringState(stateName: string, args: any) {

    }

    public onLeavingState(stateName: string) {

    }

    public onUpdateActionButtons(stateName: string, args: any) {

    }

    public setupNotifications() {}
}