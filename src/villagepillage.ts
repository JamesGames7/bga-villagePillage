import { CardsManager } from "./cards";
import { BgaCards, BgaAnimations } from "./libs";
import { Card } from "./docs/cards";
import { Types } from "./cards";
import { VillagePillageGame, VillagePillageGamedatas, VillagePillagePlayer } from "./docs/villagepillage";

export class Game implements VillagePillageGame {
    // TODO player panels
    public animationManager: InstanceType<typeof BgaAnimations.Manager> = new BgaAnimations.Manager();

    public cardManager: CardsManager = new CardsManager(this, () => this.player_num, () => this.player_id);

    public bga: Bga<VillagePillageGamedatas>;
    private gamedatas: VillagePillageGamedatas;
    
    public handStock: InstanceType<typeof BgaCards.HandStock<Card>>;
    public leftRightStocks: {[key: number]: {left: InstanceType<typeof BgaCards.SlotStock<Card>>, right: InstanceType<typeof BgaCards.SlotStock<Card>>}} = {};

    public exhaustedStocks: {[key: number]: InstanceType<typeof BgaCards.AllVisibleDeck<Card>>} = {};

    public voidStock: InstanceType<typeof BgaCards.VoidStock<Card>>;

    public shopStock: InstanceType<typeof BgaCards.LineStock<Card>>;

    private player_id: number;

    private player_num: number;
    private player_order: number[];

    private firstRound: boolean;

    constructor(bga: Bga<VillagePillageGamedatas>) {
        this.bga = bga;
    }
    
    
    public setup(gamedatas: VillagePillageGamedatas) {
        this.gamedatas = gamedatas;
        this.firstRound = gamedatas.firstRound;
        this.setupNotifications();
        this.player_num = Object.keys(gamedatas.players).length;

        this.player_id = this.bga.players.getCurrentPlayerId();
        // @ts-ignore
        let playerOrder: number[] = gamedatas.playerorder;
        // @ts-ignore
        this.player_order = gamedatas.playerorder;

        while (gamedatas.playerorder[0] != this.player_id) {
            playerOrder.push(playerOrder.shift());
        }

        playerOrder.forEach(id => {
            let info: VillagePillagePlayer = gamedatas.players[id];
            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/`
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div class="player_names">
                        ${this.player_num != 2 ? `<div id="opponent_name_${info.id}_0" class="opponent_name">${this.bga.players.getFormattedPlayerName(parseInt((gamedatas.playerorder[(gamedatas.playerorder.indexOf(parseInt(info.id.toString())) - 1 + gamedatas.playerorder.length) % gamedatas.playerorder.length]).toString()))}</div>
                        <div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}
                            <div id="exhausted_${info.id}" class="exhausted"></div>
                        </div>
                        <div id="opponent_name_${info.id}_1" class="opponent_name">${this.bga.players.getFormattedPlayerName(parseInt((gamedatas.playerorder[(gamedatas.playerorder.indexOf(parseInt(info.id.toString())) + 1) % gamedatas.playerorder.length]).toString()))}</div>` : 
                        `<div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}
                            <div id="exhausted_${info.id}" class="exhausted"></div>
                        </div>
                        <div id="opponent_name_${info.id}_0" class="opponent_name"><strong>Next Round</strong></div>
                        <div id="opponent_name_${info.id}_1" class="opponent_name"><strong>This Round</strong></div>`}
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
                if (i < info.relics) {
                    $(`relic_bank_${info.id}_${i}`).classList.remove("hidden");
                }
            }

            for (let i = 0; i < parseInt(info.stockpile); i++) {
                $(`stockpile_${info.id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_stockpile_${info.id}_${i}" class="turnip turnip_stockpile"></div>`);
            }

            $(`player_contents_${info.id}`).insertAdjacentHTML(this.player_num != 2 ? "afterbegin" : "beforeend", `<div id="left_card_${info.id}" class="left_card"></div>`);
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
            }
            if (info.right) {
                this.leftRightStocks[info.id].right.addCard(info.right);
            }

            this.exhaustedStocks[info.id] = new BgaCards.AllVisibleDeck(this.cardManager, $(`exhausted_${info.id}`), {horizontalShift: '0'});
            this.exhaustedStocks[info.id].addCards(info.exhausted);

            this.voidStock = new BgaCards.VoidStock(this.cardManager, this.bga.playerPanels.getElement(this.player_id));
        })

        $(`game_play_area`).insertAdjacentHTML("beforeend", `<div id="hand"></div>`);
        this.handStock = new BgaCards.HandStock(this.cardManager, $('hand'), {sort: this.sortFunction});
        this.handStock.addCards(gamedatas.hand);
        this.handStock.onSelectionChange = (selection: Card[], lastChange: Card) => {
            let playerStocks: {left: InstanceType<typeof BgaCards.SlotStock<Card>>, right: InstanceType<typeof BgaCards.SlotStock<Card>>} = this.leftRightStocks[this.player_id];

            if (this.handStock.getSelection().length > 0) {
                playerStocks.left.setSlotSelectionMode("single");

                playerStocks.left.onSlotClick = async (slotId) => {
                    await this.handStock.addCards(playerStocks.left.getCards());
                    await playerStocks.left.addCard(this.handStock.getSelection()[0]);

                    if (playerStocks.right.getCardCount() == 1) {
                        ($('confirm_button') as any).disabled = false;
                    } else {
                        ($('confirm_button') as any).disabled = true;
                    }

                    if (this.player_num == 2 && !this.firstRound) {
                        ($('confirm_button') as any).disabled = false;
                    }
                }
                
                if (this.player_num > 2 || this.firstRound) {
                    playerStocks.right.setSlotSelectionMode("single");
                    playerStocks.right.onSlotClick = async (slotId) => {
                        await this.handStock.addCards(playerStocks.right.getCards());
                        await playerStocks.right.addCard(this.handStock.getSelection()[0]);

                        if (playerStocks.left.getCardCount() == 1) {
                            ($('confirm_button') as any).disabled = false;
                        } else {
                            ($('confirm_button') as any).disabled = true;
                        }
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
        this.shopStock = new BgaCards.LineStock(this.cardManager, $('shop'), {sort: this.sortFunction, gap: '10px'});
        this.shopStock.addCards(gamedatas.shop);

        this.shopStock.onSelectionChange = (selection, lastChange) => {
            if ($('confirm_buy')) ($('confirm_buy') as any).disabled = selection.length == 0;
        }
    } 

    private sortFunction(a: Card, b: Card): number {
        let order = [Types.Farmer, Types.Wall, Types.Raider, Types.Merchant];
        return order.indexOf(a.type) - order.indexOf(b.type);
    }

    public async onEnteringState(stateName: string, args: any) {
        switch (stateName) {
            case "PlayCard":
                if (this.bga.players.isCurrentPlayerActive()) {
                    this.handStock.setSelectionMode("single");
                }
                break;
            case "ResolveCard":
                if (this.player_num > 2 && document.querySelectorAll(".againstCard").length == 0) {
                    (args.args.playedCards as {id: string, type: Types, type_arg: string, location: string, location_arg: string}[]).forEach(card => {
                        let el: HTMLElement = this.leftRightStocks[parseInt(card.location_arg)][card.location].element;

                        let opId: number = card.location == "left" 
                                    ? this.player_order[(this.player_order.indexOf(parseInt(card.location_arg)) - 1 + this.player_num) % this.player_num]
                                    : this.player_order[(this.player_order.indexOf(parseInt(card.location_arg)) + 1) % this.player_num];

                        let opPos = parseInt((args.args.playedCards as {id: string, type: Types, type_arg: string, location: string, location_arg: string}[])
                                    .filter(c => c.location_arg == opId.toString() && c.location != card.location)
                                    [0].type_arg)

                        el.insertAdjacentHTML("beforeend", `
                            <div class="againstCard ${card.location} imgPos_${opPos} hiddenImgPos"></div>
                        `)
                    });

                    await new Promise(r => setTimeout(r, 1));
                    document.querySelectorAll(".hiddenImgPos").forEach(c => c.classList.remove("hiddenImgPos"));
                }

                if (this.bga.players.isCurrentPlayerActive()) {
                    if (args.args.choosingMerchant) {
                        this.bga.statusBar.setTitle("${you} must choose which merchant to activate first");
                        this.leftRightStocks[this.player_id].left.setSelectionMode("single");
                        this.leftRightStocks[this.player_id].right.setSelectionMode("single");

                        this.leftRightStocks[this.player_id].left.onSelectionChange = (selection, lastChange) => {
                            if (selection.length > 0) {
                                this.leftRightStocks[this.player_id].right.unselectAll();
                                if ($('confirm_merchant')) ($('confirm_merchant') as any).disabled = false;
                            } else {
                                if ($('confirm_merchant')) ($('confirm_merchant') as any).disabled = true;
                            }
                        }
                        this.leftRightStocks[this.player_id].right.onSelectionChange = (selection, lastChange) => {
                            if (selection.length > 0) {
                                this.leftRightStocks[this.player_id].left.unselectAll();
                                if ($('confirm_merchant')) ($('confirm_merchant') as any).disabled = false;
                            } else {
                                if ($('confirm_merchant')) ($('confirm_merchant') as any).disabled = true;
                            }
                        }

                        this.bga.statusBar.addActionButton("Confirm", () => {
                            this.bga.actions.performAction("actChooseMerchant", {"side": this.leftRightStocks[this.player_id].left.getSelection().length > 0 ? "left" : "right"});
                            this.leftRightStocks[this.player_id].left.setSelectionMode("none");
                            this.leftRightStocks[this.player_id].right.setSelectionMode("none");
                        }, {disabled: true, id: "confirm_merchant"})
                    } else {
                        this.shopStock.setSelectionMode("single");
                        this.bga.statusBar.addActionButton("Confirm", () => {
                            this.bga.actions.performAction('actBuyCard', {id: this.shopStock.getSelection()[0].id});
                        }, {disabled: true, id: "confirm_buy"});
                    }
                }
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
                            rightId: (this.player_num != 2 || this.firstRound) ? this.leftRightStocks[this.player_id].right.getCards()[0].id : -1
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
        if (this.player_num > 2) {
            await this.leftRightStocks[args.player_id].left.addCard(args.left, {fromElement: this.bga.playerPanels.getElement(args.player_id)});
            await this.leftRightStocks[args.player_id].right.addCard(args.right, {fromElement: this.bga.playerPanels.getElement(args.player_id)});
        } else {
            if (args.player_id != this.player_id) {
                if (this.firstRound) {
                    await this.leftRightStocks[args.player_id].right.addCard(args.right, {fromElement: this.bga.playerPanels.getElement(args.player_id)});
                } else {
                    await this.leftRightStocks[args.player_id].right.addCard(Object.assign(args.right, {hidden: true}), {duration: 0});
                    await this.leftRightStocks[args.player_id].right.removeCard({id: -1, player_id: args.player_id.toString(), name: "hidden", type: Types.Farmer});
                    await new Promise(r => setTimeout(r, 1));
                    this.leftRightStocks[args.player_id].right.flipCard(args.right)
                    await new Promise(r => setTimeout(r, 500));
                }
                await this.leftRightStocks[args.player_id].left.addCard({id: -1, player_id: args.player_id.toString(), name: "hidden", type: Types.Farmer}, {fromElement: this.bga.playerPanels.getElement(args.player_id)});
            }
        }
    }

    public async notif_gain(args: {player_id: number, num: number}) {
        let prevStock: number = $(`stockpile_${args.player_id}`).children.length;
        for (let i = prevStock; i < args.num + prevStock; i++) {
            $(`stockpile_${args.player_id}`).insertAdjacentHTML("beforeend", /*html*/`<div id="turnip_stockpile_${args.player_id}_${i}" class="turnip turnip_stockpile"></div>`);
            
            await this.animationManager.slideIn($(`turnip_stockpile_${args.player_id}_${i}`), this.bga.playerPanels.getElement(args.player_id), {duration: 200})
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

    public async notif_steal(args: {player_id1: number, player_id2: number, num: number, stock: number, bank: number}) {
        let player_id = args.player_id1;
        let opponent_id = args.player_id2;
        
        let playerStock: number = $(`stockpile_${player_id}`).children.length;
        let opponentStock: number = $(`stockpile_${opponent_id}`).children.length;

        for (let i = 0; i < args.stock; i++) {
            $(`turnip_stockpile_${opponent_id}_${opponentStock - 1 - i}`).id = `turnip_stockpile_${player_id}_${i + playerStock}`;

            await this.animationManager.slideAndAttach($(`turnip_stockpile_${player_id}_${i + playerStock}`), $(`stockpile_${player_id}`), {bump: 1, duration: 200});
        }

        let remaining: number = args.bank;
        for (let i = 4; i >= 0; i--) {
            let turnipEl = $(`turnip_bank_${opponent_id}_${i}`);
            if (turnipEl && remaining > 0) {
                let id = `turnip_stockpile_${player_id}_${$(`stockpile_${player_id}`).children.length}`
                turnipEl.id = id;
                await this.animationManager.slideAndAttach($(id), $(`stockpile_${player_id}`), {bump: 1, duration: 200});
                remaining--;
            }
        }

        await new Promise(r => setTimeout(r, 500));
    }

    public async notif_relic(args: {player_id: number, num: "first" | "second" | "third", stock_spent: number, bank_spent: number}) {
        let num: number;
        switch (args.num) {
            case "first":
                num = 0;
                break;
            case "second":
                num = 1;
                break;
            case "third":
                num = 2;
                break;
        }

        let curStock: number = $(`stockpile_${args.player_id}`).children.length - 1;
        for (let i = 0; i < args.stock_spent; i++) {
            await this.animationManager.slideOutAndDestroy($(`turnip_stockpile_${args.player_id}_${curStock - i}`), this.bga.playerPanels.getElement(args.player_id), {duration: 200});
        }

        let remainingBankSpent = args.bank_spent;

        for (let i = 4; i >= 0; i--) {
            if (remainingBankSpent > 0 && $(`turnip_wrap_${args.player_id}_${i}`).children.length > 0) {
                await this.animationManager.slideOutAndDestroy($(`turnip_bank_${args.player_id}_${i}`), this.bga.playerPanels.getElement(args.player_id), {duration: 200});
                remainingBankSpent--;
            }
        }

        await new Promise(r => setTimeout(r, 0)).then(() => $(`relic_bank_${args.player_id}_${num}`).classList.remove("hidden"));
        await this.animationManager.slideIn( $(`relic_bank_${args.player_id}_${num}`), this.bga.playerPanels.getElement(args.player_id), {duration: 500});
        await new Promise(r => setTimeout(r, 500));
    }

    public notif_buyCardStart(args: any = null) {
        this.shopStock.setSelectionMode("single");
        this.bga.statusBar.addActionButton("Confirm", () => {
            this.bga.actions.performAction('actBuyCard', {id: this.shopStock.getSelection()[0].id});
        }, {disabled: true, id: "confirm_buy"});
    }

    public async notif_buyCard(args: {card: Card, player_id: number, updatePlace: "bank" | "stockpile", num: number}) {
        this.shopStock.setSelectionMode("none");
        let numLeft = args.num;
        switch (args.updatePlace) {
            case "bank":
                for (let i = 4; i >= 0; i--) {
                    if ($(`turnip_wrap_${args.player_id}_${i}`).children.length > 0 && numLeft > 0) {
                        await this.animationManager.slideOutAndDestroy($(`turnip_bank_${args.player_id}_${i}`), this.bga.playerPanels.getElement(args.player_id), {duration: 200});
                        numLeft--;
                    }
                }
                break;
            case "stockpile":
                for (let i = 0; i < numLeft; i++) {
                    await this.animationManager.slideOutAndDestroy($(`turnip_stockpile_${args.player_id}_${$(`stockpile_${args.player_id}`).children.length - 1}`), this.bga.playerPanels.getElement(args.player_id), {duration: 200});
                }
                break;
        }
        if (this.player_id == args.player_id) {
            await this.handStock.addCard(args.card);
            await this.handStock.addCard({id: args.card.id, type: args.card.type, player_id: args.player_id.toString(), name: args.card.name}, {duration: 0});
            await this.handStock.removeCard(args.card);
        } else {
            await this.voidStock.addCard(args.card);
        }
        await new Promise(r => setTimeout(r, 500));
    }

    public async notif_drawNewShop(args: {card: Card}) {
        await this.shopStock.addCard(args.card, {fromStock: this.voidStock, initialSide: "back", finalSide: "front"});
        await new Promise(r => setTimeout(r, 500));
    }

    public async notif_drawCard(args: {player_id: number, _private: {new_card: Card}}) {
        if (this.player_id == args.player_id) {
            let card: Card = args._private.new_card;
            await this.handStock.addCard(card, {fromStock: this.voidStock, initialSide: "back", finalSide: "front"})
            await this.handStock.addCard({name: card.name, id: card.id, type: card.type, player_id: args.player_id.toString()}, {duration: 0});
            await this.handStock.removeCard(card);
            await new Promise(r => setTimeout(r, 500));
        }
    }

    public async notif_reset(args: Card[][]) {
        if (this.player_num > 2) {
            document.querySelectorAll(".againstCard").forEach(c => {
                c.classList.add("hiddenImgPos")
                console.log(c);
            });
        }
        for (let player_id of this.gamedatas.playerorder) {
            player_id = player_id.toString();
            if (player_id == this.player_id.toString()) {
                await this.handStock.addCards(this.exhaustedStocks[player_id].getCards());
            } else {
                await this.voidStock.addCards(this.exhaustedStocks[player_id].getCards())
            }
            let curArgs: Card[] = args[0].filter(arg => arg.player_id == player_id);
            await this.exhaustedStocks[player_id].addCards(curArgs);
            if (player_id == this.player_id.toString()) {
                if (this.player_num > 2) {
                    await this.handStock.addCards(this.leftRightStocks[player_id].left.getCards().filter(card => !curArgs.map(arg => arg.id).includes(card.id)));
                }
                await this.handStock.addCards(this.leftRightStocks[player_id].right.getCards().filter(card => !curArgs.map(arg => arg.id).includes(card.id)));
            } else {
                if (this.player_num > 2){
                    await this.leftRightStocks[player_id].left.removeAll({slideTo: this.bga.playerPanels.getElement(parseInt(player_id))})
                }
                await this.leftRightStocks[player_id].right.removeAll({slideTo: this.bga.playerPanels.getElement(parseInt(player_id))})
            }
            if (this.player_num == 2) {
                this.leftRightStocks[player_id].right.addCards(this.leftRightStocks[player_id].left.getCards());
            }
        }
        this.handStock.setSelectionMode("single");
        this.firstRound = false;
        document.querySelectorAll(".againstCard").forEach(c => c.remove())
        await new Promise(r => setTimeout(r, 500));
    }

    public async notif_chooseMerchantStart(args: any) {
        this.bga.statusBar.setTitle("${you} must choose which merchant to activate first");

        this.leftRightStocks[this.player_id].left.setSelectionMode("single");
        this.leftRightStocks[this.player_id].right.setSelectionMode("single");

        this.leftRightStocks[this.player_id].left.onSelectionChange = (selection, lastChange) => {
            if (selection.length > 0) {
                this.leftRightStocks[this.player_id].right.unselectAll();
                if ($('confirm_merchant')) ($('confirm_merchant') as any).disabled = false;
            } else {
                if ($('confirm_merchant')) ($('confirm_merchant') as any).disabled = true;
            }
        }
        this.leftRightStocks[this.player_id].right.onSelectionChange = (selection, lastChange) => {
            if (selection.length > 0) {
                this.leftRightStocks[this.player_id].left.unselectAll();
                if ($('confirm_merchant')) ($('confirm_merchant') as any).disabled = false;
            } else {
                if ($('confirm_merchant')) ($('confirm_merchant') as any).disabled = true;
            }
        }

        this.bga.statusBar.addActionButton("Confirm", () => {
            this.bga.actions.performAction("actChooseMerchant", {"side": this.leftRightStocks[this.player_id].left.getSelection().length > 0 ? "left" : "right"});
            this.leftRightStocks[this.player_id].left.setSelectionMode("none");
            this.leftRightStocks[this.player_id].right.setSelectionMode("none");
        }, {disabled: true, id: "confirm_merchant"})
    }

	public notif_test(args: any) {
		console.log(args);
	}
}