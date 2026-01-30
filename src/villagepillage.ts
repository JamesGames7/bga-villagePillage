import { CardsManager } from "./cards";
import { BgaCards, BgaAnimations } from "./libs";
import { Card } from "./docs/cards";
import { Types } from "./cards";

export class Game implements VillagePillageGame {
    public animationManager: InstanceType<typeof BgaAnimations.Manager> = new BgaAnimations.Manager();

    public cardManager: CardsManager = new CardsManager(this);

    public bga: Bga<VillagePillageGamedatas>;
    private gamedatas: VillagePillageGamedatas;
    
    public handStock: InstanceType<typeof BgaCards.HandStock<Card>>;

    public shopStock: InstanceType<typeof BgaCards.LineStock<Card>>;

    constructor(bga: Bga<VillagePillageGamedatas>) {
        this.bga = bga;
    }
    
    
    public setup(gamedatas: VillagePillageGamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();
        let currentPlayerId: number = this.bga.players.getCurrentPlayerId();

        // @ts-ignore
        let playerOrder: number[] = gamedatas.playerorder;
        while (gamedatas.playerorder[0] != currentPlayerId) {
            playerOrder.push(playerOrder.shift());
        }

        playerOrder.forEach(id => {
            let info: VillagePillagePlayer = gamedatas.players[id];

            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/`
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}</div>
                    <div id="player_contents_${info.id}" class="player_contents">
                        <div id="bank_${info.id}" class="bank"></div>
                        <div id="stockpile_${info.id}" class="stockpile"></div>
                    </div>
                </div>
            `)
            for (let i = 0; i < 5; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_bank_${info.id}_${i}" class="turnip turnip_${i}"></div>`);
                if (i >= parseInt(info.bank)) $(`turnip_bank_${info.id}_${i}`).classList.add("hidden");
            }
            for (let i = 0; i < 3; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="relic_bank_${info.id}_${i}" class="relic relic_${i} hidden"></div>`);
            }

            for (let i = 0; i < parseInt(info.stockpile); i++) {
                $(`stockpile_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_stockpile_${info.id}_${i}" class="turnip turnip_stockpile"></div>`);
                $(`turnip_stockpile_${info.id}_${i}`).style.top = Math.random() * 237 + "px";
                $(`turnip_stockpile_${info.id}_${i}`).style.left = Math.random() * 140 + "px";
            }

            console.log(info);
        })

        $(`game_play_area`).insertAdjacentHTML("beforeend", `<div id="hand"></div>`);
        this.handStock = new BgaCards.HandStock(this.cardManager, $('hand'), {sort: this.sortFunction});
        gamedatas.hand.forEach(card => {
            this.handStock.addCard({name: card.name, id: card.id, type: Types[card.type]})
        })
        
        $(`game_play_area`).insertAdjacentHTML("afterbegin", `<div id="shop"></div>`);
        this.shopStock = new BgaCards.LineStock(this.cardManager, $('shop'), {sort: this.sortFunction});
        gamedatas.shop.forEach(card => {
            this.shopStock.addCard({name: card.name, id: card.id, type: Types[card.type]})
        })
    } 

    private sortFunction(a: Card, b: Card): number {
        let order = [Types.Farmer, Types.Wall, Types.Raider, Types.Merchant];
        return order.indexOf(a.type) - order.indexOf(b.type);
    }

    public onEnteringState(stateName: string, args: any) {

    }

    public onLeavingState(stateName: string) {

    }

    public onUpdateActionButtons(stateName: string, args: any) {

    }

    public setupNotifications() {}
}