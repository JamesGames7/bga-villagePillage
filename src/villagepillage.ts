import { CardsManager } from "./cards";
// import { BgaAnimations, BgaCards } from "./libs";
import { BgaCards, BgaAnimations } from "./libs";
import { Card } from "./docs/cards";
import { Types } from "./cards";

export class Game implements VillagePillageGame {
    // @ts-ignore
    public animationManager: BgaAnimations.Manager = new BgaAnimations.Manager();
    // @ts-ignore
    public testStocks: BgaCards.LineStock<Card>[] = [];

    public cardManager: CardsManager = new CardsManager(this);

    public bga: Bga<VillagePillageGamedatas>;
    private gamedatas: VillagePillageGamedatas;


    constructor(bga: Bga<VillagePillageGamedatas>) {
        this.bga = bga;
    }
    
    
    public setup(gamedatas: VillagePillageGamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();

        let i: number = 0;
        Object.entries(gamedatas.players).forEach(el => {
            let info: VillagePillagePlayer = el[1];

            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/`
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}</div>
                    <div id="player_contents_${info.id}" class="player_contents">
                        <div id="bank_${info.id}" class="bank"></div>
                        <div id="test_card_${info.id}" class="test"></div>
                    </div>
                </div>
            `)

            this.testStocks.push(new BgaCards.LineStock(this.cardManager, $(`test_card_${info.id}`)));
            this.testStocks[i].addCard({name: "test", id: i, type: Types.Farmer})
            i++;
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