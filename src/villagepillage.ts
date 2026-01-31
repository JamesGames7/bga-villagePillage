import { CardsManager } from "./cards";
import { BgaCards, BgaAnimations } from "./libs";
import { Card } from "./docs/cards";
import { Types } from "./cards";
import { VillagePillageGame, VillagePillageGamedatas, VillagePillagePlayer } from "./docs/villagepillage";

export class Game implements VillagePillageGame {
    public animationManager: InstanceType<typeof BgaAnimations.Manager> = new BgaAnimations.Manager();

    public cardManager: CardsManager = new CardsManager(this);

    public bga: Bga<VillagePillageGamedatas>;
    private gamedatas: VillagePillageGamedatas;
    
    public handStock: InstanceType<typeof BgaCards.HandStock<Card>>;
    public leftRightStocks: {[key: number]: {left: InstanceType<typeof BgaCards.SlotStock<Card>>, right: InstanceType<typeof BgaCards.SlotStock<Card>>}} = {};

    public shopStock: InstanceType<typeof BgaCards.LineStock<Card>>;

    private player_id: number;

    constructor(bga: Bga<VillagePillageGamedatas>) {
        this.bga = bga;
    }
    
    
    public setup(gamedatas: VillagePillageGamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();

        this.player_id = this.bga.players.getCurrentPlayerId();
        // @ts-ignore
        let playerOrder: number[] = gamedatas.playerorder;
        while (gamedatas.playerorder[0] != this.player_id) {
            playerOrder.push(playerOrder.shift());
        }

        playerOrder.forEach(id => {
            let info: VillagePillagePlayer = gamedatas.players[id];
            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/`
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div class="player_names">
                        <div id="opponent_name_${info.id}_0" class="opponent_name">${this.bga.players.getFormattedPlayerName(parseInt((gamedatas.playerorder[(gamedatas.playerorder.indexOf(parseInt(info.id.toString())) - 1 + gamedatas.playerorder.length) % gamedatas.playerorder.length]).toString()))}</div>
                        <div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}</div>
                        <div id="opponent_name_${info.id}_1" class="opponent_name">${this.bga.players.getFormattedPlayerName(parseInt((gamedatas.playerorder[(gamedatas.playerorder.indexOf(parseInt(info.id.toString())) + 1) % gamedatas.playerorder.length]).toString()))}</div>
                    </div>
                    <div id="player_contents_${info.id}" class="player_contents">
                        <div id="bank_${info.id}" class="bank"></div>
                        <div id="stockpile_${info.id}" class="stockpile"></div>
                    </div>
                </div>
            `)
            for (let i = 0; i < 5; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_wrap_${info.id}_${i}" class="turnip turnip_wrap_${i}"></div>`);
            }
            for (let i = 0; i < parseInt(info.bank); i++) {
                $(`turnip_wrap_${info.id}_${i}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_bank_${info.id}_${i}" class="turnip"></div>`);
            }
            for (let i = 0; i < 3; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="relic_bank_${info.id}_${i}" class="relic relic_${i} hidden"></div>`);
            }

            for (let i = 0; i < parseInt(info.stockpile); i++) {
                $(`stockpile_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_stockpile_${info.id}_${i}" class="turnip turnip_stockpile"></div>`);
            }

            $(`player_contents_${info.id}`).insertAdjacentHTML("afterbegin", `<div id="left_card_${info.id}" class="left_card"></div>`);
            $(`player_contents_${info.id}`).insertAdjacentHTML("beforeend", `<div id="right_card_${info.id}" class="right_card"></div>`);

            this.leftRightStocks[info.id] = {
                left: new BgaCards.SlotStock(this.cardManager, $(`left_card_${info.id}`), {
                    mapCardToSlot: (card) => 0, slotsIds: [0],
                    selectedSlotStyle: {class: "selected"},
                    selectableSlotStyle: {class: "selectable"},
                }),
                right: new BgaCards.SlotStock(this.cardManager, $(`right_card_${info.id}`), {
                    mapCardToSlot: (card) => 0, slotsIds: [0],
                    selectedSlotStyle: {class: "selected"},
                    selectableSlotStyle: {class: "selectable"},
                }),
            }

            if (info.left) {
                this.leftRightStocks[info.id].left.addCard(info.left);
                this.leftRightStocks[info.id].right.addCard(info.right);
            }
        })

        $(`game_play_area`).insertAdjacentHTML("beforeend", `<div id="hand"></div>`);
        this.handStock = new BgaCards.HandStock(this.cardManager, $('hand'), {sort: this.sortFunction});
        this.handStock.addCards(gamedatas.hand);
        this.handStock.onSelectionChange = (selection: Card[], lastChange: Card) => {
            let playerStocks: {left: InstanceType<typeof BgaCards.SlotStock<Card>>, right: InstanceType<typeof BgaCards.SlotStock<Card>>} = this.leftRightStocks[this.player_id];

            if (this.handStock.getSelection().length > 0) {
                playerStocks.left.setSlotSelectionMode("single");
                playerStocks.right.setSlotSelectionMode("single");

                playerStocks.left.onSlotClick = async (slotId) => {
                    await this.handStock.addCards(playerStocks.left.getCards());
                    await playerStocks.left.addCard(this.handStock.getSelection()[0]);

                    if (playerStocks.right.getCardCount() == 1) {
                        ($('confirm_button') as any).disabled = false;
                    } else {
                        ($('confirm_button') as any).disabled = true;
                    }
                }

                playerStocks.right.onSlotClick = async (slotId) => {
                    await this.handStock.addCards(playerStocks.right.getCards());
                    await playerStocks.right.addCard(this.handStock.getSelection()[0]);

                    if (playerStocks.left.getCardCount() == 1) {
                        ($('confirm_button') as any).disabled = false;
                    } else {
                        ($('confirm_button') as any).disabled = true;
                    }
                }
            } else {
                playerStocks.left.setSlotSelectionMode("none");
                playerStocks.right.setSlotSelectionMode("none");

                playerStocks.left.onSlotClick = (slotId) => {};
                playerStocks.right.onSlotClick = (slotId) => {};
            }
        }
        
        $(`game_play_area`).insertAdjacentHTML("afterbegin", `<div id="shop"></div>`);
        this.shopStock = new BgaCards.LineStock(this.cardManager, $('shop'), {sort: this.sortFunction});
        this.shopStock.addCards(gamedatas.shop);
    } 

    private sortFunction(a: Card, b: Card): number {
        let order = [Types.Farmer, Types.Wall, Types.Raider, Types.Merchant];
        return order.indexOf(a.type) - order.indexOf(b.type);
    }

    public onEnteringState(stateName: string, args: any) {
        switch (stateName) {
            case "PlayCard":
                if (this.bga.players.isCurrentPlayerActive()) {
                    this.handStock.setSelectionMode("single");
                }
                break;
        }
    }

    public onLeavingState(stateName: string) {

    }

    public onUpdateActionButtons(stateName: string, args: any) {
        switch (stateName) {
            case "PlayCard":
                if (this.bga.players.isCurrentPlayerActive()) {
                    this.bga.statusBar.addActionButton("Confirm", () => {
                        this.bga.actions.performAction("actChooseCards", {
                            leftId: this.leftRightStocks[this.player_id].left.getCards()[0].id, 
                            rightId: this.leftRightStocks[this.player_id].right.getCards()[0].id
                        })
                        this.handStock.setSelectionMode("none");
                    }, {disabled: true, id: "confirm_button"})
                    this.bga.statusBar.addActionButton("Reset", async () => {
                        let playerStocks: {left: InstanceType<typeof BgaCards.SlotStock<Card>>, right: InstanceType<typeof BgaCards.SlotStock<Card>>} = this.leftRightStocks[this.player_id];
                        
                        await this.handStock.addCards(playerStocks.left.getCards());
                        await this.handStock.addCards(playerStocks.right.getCards());

                        ($('confirm_button') as any).disabled = true;
                    }, {color: "secondary"})
                    break;
                } else {
                    this.bga.statusBar.addActionButton("Restart Turn", () => this.bga.actions.performAction("actRestartTurn", {}, {checkAction: false}), {color: "alert"});
                }
        }
    }

    public setupNotifications() {
        this.bga.notifications.setupPromiseNotifications();
    }

    public async notif_restartTurn(args: any) {
        await this.handStock.addCards(this.leftRightStocks[this.player_id].left.getCards());
        await this.handStock.addCards(this.leftRightStocks[this.player_id].right.getCards());
        this.handStock.setSelectionMode("single");
    }

    public async notif_reveal(args: {player_id: number, left: Card, right: Card}) {
        await this.leftRightStocks[args.player_id].left.addCard(args.left, {fromElement: $(`overall_player_board_${args.player_id}`)});
        await this.leftRightStocks[args.player_id].right.addCard(args.right, {fromElement: $(`overall_player_board_${args.player_id}`)});
    }

    public async notif_gain(args: {player_id: number, num: number}) {
        let prevStock: number = $(`stockpile_${args.player_id}`).children.length;
        for (let i = prevStock; i < args.num + prevStock; i++) {
            $(`stockpile_${args.player_id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_stockpile_${args.player_id}_${i}" class="turnip turnip_stockpile"></div>`);
            
            await this.animationManager.slideIn($(`turnip_stockpile_${args.player_id}_${i}`), $(`overall_player_board_${args.player_id}`), {duration: 200})
        }
        await new Promise(r => setTimeout(r, 500))
    }

    public async notif_bank(args: {player_id: number, num: number}) {
        let prevStock: number = $(`stockpile_${args.player_id}`).children.length;
        let prevBank: number = 0;
        for (let i = 0; i < 5; i++) {
            if ($(`bank_${args.player_id}`).children[i].children.length > 0) prevBank++;
        }
        for (let i = 0; i < args.num; i++) {
            $(`turnip_stockpile_${args.player_id}_${prevStock - 1 - i}`).id = `turnip_bank_${args.player_id}_${i + prevBank}`;

            await this.animationManager.slideAndAttach($(`turnip_bank_${args.player_id}_${i + prevBank}`), $(`turnip_wrap_${args.player_id}_${i + prevBank}`), {bump: 1, duration: 200})
        }
        await new Promise(r => setTimeout(r, 500));
    }

    public async notif_steal(args: {player_id1: number, player_id2: number, num: number}) {
        let player_id = args.player_id1;
        let opponent_id = args.player_id2;
        
        let playerStock: number = $(`stockpile_${player_id}`).children.length;
        let opponentStock: number = $(`stockpile_${opponent_id}`).children.length;

        for (let i = 0; i < args.num; i++) {
            $(`turnip_stockpile_${opponent_id}_${opponentStock - 1 - i}`).id = `turnip_stockpile_${player_id}_${i + playerStock}`;

            await this.animationManager.slideAndAttach($(`turnip_stockpile_${player_id}_${i + playerStock}`), $(`stockpile_${player_id}`), {bump: 1, duration: 200});
        }
        await new Promise(r => setTimeout(r, 500));
    }

    public async notif_reset(args?: null) {
        for (const player_id of this.gamedatas.playerorder) {
            if (player_id == this.player_id) {
                await this.handStock.addCards(this.leftRightStocks[player_id].left.getCards());
                await this.handStock.addCards(this.leftRightStocks[player_id].right.getCards());
            } else {
                await this.leftRightStocks[player_id].left.removeAll({slideTo: $(`overall_player_board_${player_id}`)})
                await this.leftRightStocks[player_id].right.removeAll({slideTo: $(`overall_player_board_${player_id}`)})
            }
        }
    }

	public notif_test(args: any) {
		console.log(args);
	}
}