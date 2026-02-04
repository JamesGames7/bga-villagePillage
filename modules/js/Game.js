const BgaAnimations = await globalThis.importEsmLib('bga-animations', '1.x');
const BgaCards = await globalThis.importEsmLib('bga-cards', '1.x');

class CardsManager extends BgaCards.Manager {
    constructor(game) {
        super({
            getId: (card) => card.player_id + "-" + card.id,
            setupDiv: (card, div) => {
                div.dataset.id = card.id.toString();
                div.dataset.type = card.type;
                div.dataset.name = card.name;
            },
            setupFrontDiv: (card, div) => {
                div.style.backgroundImage = `url(${g_gamethemeurl}img/baseCards.jpg)`;
                div.style.backgroundSize = `700% 400%`;
                div.style.backgroundPositionX = `-${Math.floor(card.id / 4)}00%`;
                div.style.backgroundPositionY = `-${card.id % 4}00%`;
                game.bga.gameui.addTooltipHtml(div.id, /*html*/ `<strong>Name:</strong> ${card.name}<br><strong>Type:</strong> ${card.type}<br>`);
            },
            setupBackDiv: (card, div) => {
                div.style.backgroundImage = `url(${g_gamethemeurl}img/baseCards.jpg)`;
                div.style.backgroundSize = `700% 400%`;
                div.style.backgroundPosition = `-600% 0`;
            },
            cardBorderRadius: "4px",
            selectableCardStyle: { class: "selectable" },
            selectedCardStyle: { class: "selected" },
            isCardVisible: () => true,
            animationManager: game.animationManager,
            cardWidth: 200,
            cardHeight: 298
        });
        this.game = game;
    }
}
var Types;
(function (Types) {
    Types["Raider"] = "Raider";
    Types["Wall"] = "Wall";
    Types["Farmer"] = "Farmer";
    Types["Merchant"] = "Merchant";
})(Types || (Types = {}));

class Game {
    constructor(bga) {
        this.animationManager = new BgaAnimations.Manager();
        this.cardManager = new CardsManager(this);
        this.leftRightStocks = {};
        this.exhaustedStocks = {};
        this.bga = bga;
    }
    setup(gamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();
        this.player_id = this.bga.players.getCurrentPlayerId();
        // @ts-ignore
        let playerOrder = gamedatas.playerorder;
        while (gamedatas.playerorder[0] != this.player_id) {
            playerOrder.push(playerOrder.shift());
        }
        playerOrder.forEach(id => {
            let info = gamedatas.players[id];
            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/ `
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div class="player_names">
                        <div id="opponent_name_${info.id}_0" class="opponent_name">${this.bga.players.getFormattedPlayerName(parseInt((gamedatas.playerorder[(gamedatas.playerorder.indexOf(parseInt(info.id.toString())) - 1 + gamedatas.playerorder.length) % gamedatas.playerorder.length]).toString()))}</div>
                        <div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}
                            <div id="exhausted_${info.id}" class="exhausted"></div>
                        </div>
                        <div id="opponent_name_${info.id}_1" class="opponent_name">${this.bga.players.getFormattedPlayerName(parseInt((gamedatas.playerorder[(gamedatas.playerorder.indexOf(parseInt(info.id.toString())) + 1) % gamedatas.playerorder.length]).toString()))}</div>
                    </div>
                    <div id="player_contents_${info.id}" class="player_contents">
                        <div id="bank_${info.id}" class="bank"></div>
                        <div id="stockpile_${info.id}" class="stockpile"></div>
                    </div>
                </div>
            `);
            for (let i = 0; i < 5; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/ `<div id="turnip_wrap_${info.id}_${i}" class="turnip turnip_wrap_${i}"></div>`);
            }
            for (let i = 0; i < parseInt(info.bank); i++) {
                $(`turnip_wrap_${info.id}_${i}`).insertAdjacentHTML("beforeend", /*html*/ `<div id="turnip_bank_${info.id}_${i}" class="turnip"></div>`);
            }
            for (let i = 0; i < 3; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/ `<div id="relic_bank_${info.id}_${i}" class="relic relic_${i} hidden"></div>`);
                if (i < info.relics) {
                    $(`relic_bank_${info.id}_${i}`).classList.remove("hidden");
                }
            }
            for (let i = 0; i < parseInt(info.stockpile); i++) {
                $(`stockpile_${info.id}`).insertAdjacentHTML("beforeend", /*html*/ `<div id="turnip_stockpile_${info.id}_${i}" class="turnip turnip_stockpile"></div>`);
            }
            $(`player_contents_${info.id}`).insertAdjacentHTML("afterbegin", `<div id="left_card_${info.id}" class="left_card"></div>`);
            $(`player_contents_${info.id}`).insertAdjacentHTML("beforeend", `<div id="right_card_${info.id}" class="right_card"></div>`);
            this.leftRightStocks[info.id] = {
                left: new BgaCards.SlotStock(this.cardManager, $(`left_card_${info.id}`), {
                    mapCardToSlot: (card) => 0, slotsIds: [0],
                    selectedSlotStyle: { class: "selected" },
                    selectableSlotStyle: { class: "selectable" },
                }),
                right: new BgaCards.SlotStock(this.cardManager, $(`right_card_${info.id}`), {
                    mapCardToSlot: (card) => 0, slotsIds: [0],
                    selectedSlotStyle: { class: "selected" },
                    selectableSlotStyle: { class: "selectable" },
                }),
            };
            if (info.left) {
                this.leftRightStocks[info.id].left.addCard(info.left);
                this.leftRightStocks[info.id].right.addCard(info.right);
            }
            this.exhaustedStocks[info.id] = new BgaCards.AllVisibleDeck(this.cardManager, $(`exhausted_${info.id}`), { horizontalShift: '0' });
            this.exhaustedStocks[info.id].addCards(info.exhausted);
            this.voidStock = new BgaCards.VoidStock(this.cardManager, $(`overall_player_board_${this.player_id}`));
        });
        $(`game_play_area`).insertAdjacentHTML("beforeend", `<div id="hand"></div>`);
        this.handStock = new BgaCards.HandStock(this.cardManager, $('hand'), { sort: this.sortFunction });
        this.handStock.addCards(gamedatas.hand);
        this.handStock.onSelectionChange = (selection, lastChange) => {
            let playerStocks = this.leftRightStocks[this.player_id];
            if (this.handStock.getSelection().length > 0) {
                playerStocks.left.setSlotSelectionMode("single");
                playerStocks.right.setSlotSelectionMode("single");
                playerStocks.left.onSlotClick = async (slotId) => {
                    await this.handStock.addCards(playerStocks.left.getCards());
                    await playerStocks.left.addCard(this.handStock.getSelection()[0]);
                    if (playerStocks.right.getCardCount() == 1) {
                        $('confirm_button').disabled = false;
                    }
                    else {
                        $('confirm_button').disabled = true;
                    }
                };
                playerStocks.right.onSlotClick = async (slotId) => {
                    await this.handStock.addCards(playerStocks.right.getCards());
                    await playerStocks.right.addCard(this.handStock.getSelection()[0]);
                    if (playerStocks.left.getCardCount() == 1) {
                        $('confirm_button').disabled = false;
                    }
                    else {
                        $('confirm_button').disabled = true;
                    }
                };
            }
            else {
                playerStocks.left.setSlotSelectionMode("none");
                playerStocks.right.setSlotSelectionMode("none");
                playerStocks.left.onSlotClick = (slotId) => { };
                playerStocks.right.onSlotClick = (slotId) => { };
            }
        };
        $(`game_play_area`).insertAdjacentHTML("afterbegin", `<div id="shop"></div>`);
        this.shopStock = new BgaCards.LineStock(this.cardManager, $('shop'), { sort: this.sortFunction });
        this.shopStock.addCards(gamedatas.shop);
        this.shopStock.onSelectionChange = (selection, lastChange) => {
            if ($('confirm_buy'))
                $('confirm_buy').disabled = selection.length == 0;
        };
    }
    sortFunction(a, b) {
        let order = [Types.Farmer, Types.Wall, Types.Raider, Types.Merchant];
        return order.indexOf(a.type) - order.indexOf(b.type);
    }
    onEnteringState(stateName, args) {
        switch (stateName) {
            case "PlayCard":
                if (this.bga.players.isCurrentPlayerActive()) {
                    this.handStock.setSelectionMode("single");
                }
                break;
            case "ResolveCard":
                if (this.bga.players.isCurrentPlayerActive()) {
                    if (args.args.choosingMerchant) {
                        this.bga.statusBar.setTitle("${you} must choose which merchant to activate first");
                        this.leftRightStocks[this.player_id].left.setSelectionMode("single");
                        this.leftRightStocks[this.player_id].right.setSelectionMode("single");
                        this.leftRightStocks[this.player_id].left.onSelectionChange = (selection, lastChange) => {
                            if (selection.length > 0) {
                                this.leftRightStocks[this.player_id].right.unselectAll();
                                if ($('confirm_merchant'))
                                    $('confirm_merchant').disabled = false;
                            }
                            else {
                                if ($('confirm_merchant'))
                                    $('confirm_merchant').disabled = true;
                            }
                        };
                        this.leftRightStocks[this.player_id].right.onSelectionChange = (selection, lastChange) => {
                            if (selection.length > 0) {
                                this.leftRightStocks[this.player_id].left.unselectAll();
                                if ($('confirm_merchant'))
                                    $('confirm_merchant').disabled = false;
                            }
                            else {
                                if ($('confirm_merchant'))
                                    $('confirm_merchant').disabled = true;
                            }
                        };
                        this.bga.statusBar.addActionButton("Confirm", () => {
                            this.bga.actions.performAction("actChooseMerchant", { "side": this.leftRightStocks[this.player_id].left.getSelection().length > 0 ? "left" : "right" });
                            this.leftRightStocks[this.player_id].left.setSelectionMode("none");
                            this.leftRightStocks[this.player_id].right.setSelectionMode("none");
                        }, { disabled: true, id: "confirm_merchant" });
                    }
                    else {
                        this.shopStock.setSelectionMode("single");
                        this.bga.statusBar.addActionButton("Confirm", () => {
                            this.bga.actions.performAction('actBuyCard', { id: this.shopStock.getSelection()[0].id });
                        }, { disabled: true, id: "confirm_buy" });
                    }
                }
        }
    }
    onLeavingState(stateName) {
    }
    onUpdateActionButtons(stateName, args) {
        switch (stateName) {
            case "PlayCard":
                if (this.bga.players.isCurrentPlayerActive()) {
                    this.bga.statusBar.addActionButton("Confirm", () => {
                        this.bga.actions.performAction("actChooseCards", {
                            leftId: this.leftRightStocks[this.player_id].left.getCards()[0].id,
                            rightId: this.leftRightStocks[this.player_id].right.getCards()[0].id
                        });
                        this.handStock.setSelectionMode("none");
                    }, { disabled: true, id: "confirm_button" });
                    this.bga.statusBar.addActionButton("Reset", async () => {
                        let playerStocks = this.leftRightStocks[this.player_id];
                        await this.handStock.addCards(playerStocks.left.getCards());
                        await this.handStock.addCards(playerStocks.right.getCards());
                        $('confirm_button').disabled = true;
                    }, { color: "secondary" });
                    break;
                }
                else {
                    this.bga.statusBar.addActionButton("Restart Turn", () => this.bga.actions.performAction("actRestartTurn", {}, { checkAction: false }), { color: "alert" });
                }
        }
    }
    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications();
    }
    async notif_restartTurn(args) {
        await this.handStock.addCards(this.leftRightStocks[this.player_id].left.getCards());
        await this.handStock.addCards(this.leftRightStocks[this.player_id].right.getCards());
        this.handStock.setSelectionMode("single");
    }
    async notif_reveal(args) {
        await this.leftRightStocks[args.player_id].left.addCard(args.left, { fromElement: $(`overall_player_board_${args.player_id}`) });
        await this.leftRightStocks[args.player_id].right.addCard(args.right, { fromElement: $(`overall_player_board_${args.player_id}`) });
    }
    async notif_gain(args) {
        let prevStock = $(`stockpile_${args.player_id}`).children.length;
        for (let i = prevStock; i < args.num + prevStock; i++) {
            $(`stockpile_${args.player_id}`).insertAdjacentHTML("beforeend", /*html*/ `<div id="turnip_stockpile_${args.player_id}_${i}" class="turnip turnip_stockpile"></div>`);
            await this.animationManager.slideIn($(`turnip_stockpile_${args.player_id}_${i}`), $(`overall_player_board_${args.player_id}`), { duration: 200 });
        }
        await new Promise(r => setTimeout(r, 500));
    }
    async notif_bank(args) {
        let prevStock = $(`stockpile_${args.player_id}`).children.length;
        let prevBank = 0;
        for (let i = 0; i < 5; i++) {
            if ($(`bank_${args.player_id}`).children[i].children.length > 0)
                prevBank++;
        }
        for (let i = 0; i < args.num; i++) {
            $(`turnip_stockpile_${args.player_id}_${prevStock - 1 - i}`).id = `turnip_bank_${args.player_id}_${i + prevBank}`;
            await this.animationManager.slideAndAttach($(`turnip_bank_${args.player_id}_${i + prevBank}`), $(`turnip_wrap_${args.player_id}_${i + prevBank}`), { bump: 1, duration: 200 });
        }
        await new Promise(r => setTimeout(r, 500));
    }
    async notif_steal(args) {
        let player_id = args.player_id1;
        let opponent_id = args.player_id2;
        let playerStock = $(`stockpile_${player_id}`).children.length;
        let opponentStock = $(`stockpile_${opponent_id}`).children.length;
        for (let i = 0; i < args.stock; i++) {
            $(`turnip_stockpile_${opponent_id}_${opponentStock - 1 - i}`).id = `turnip_stockpile_${player_id}_${i + playerStock}`;
            await this.animationManager.slideAndAttach($(`turnip_stockpile_${player_id}_${i + playerStock}`), $(`stockpile_${player_id}`), { bump: 1, duration: 200 });
        }
        let remaining = args.bank;
        for (let i = 4; i >= 0; i--) {
            let turnipEl = $(`turnip_bank_${opponent_id}_${i}`);
            if (turnipEl && remaining > 0) {
                let id = `turnip_stockpile_${player_id}_${$(`stockpile_${player_id}`).children.length}`;
                turnipEl.id = id;
                await this.animationManager.slideAndAttach($(id), $(`stockpile_${player_id}`), { bump: 1, duration: 200 });
                remaining--;
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
    async notif_relic(args) {
        let num;
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
        let curStock = $(`stockpile_${args.player_id}`).children.length - 1;
        for (let i = 0; i < args.stock_spent; i++) {
            await this.animationManager.slideOutAndDestroy($(`turnip_stockpile_${args.player_id}_${curStock - i}`), $(`overall_player_board_${args.player_id}`), { duration: 200 });
        }
        let remainingBankSpent = args.bank_spent;
        for (let i = 4; i >= 0; i--) {
            if (remainingBankSpent > 0 && $(`turnip_wrap_${args.player_id}_${i}`).children.length > 0) {
                await this.animationManager.slideOutAndDestroy($(`turnip_bank_${args.player_id}_${i}`), $(`overall_player_board_${args.player_id}`), { duration: 200 });
                remainingBankSpent--;
            }
        }
        await new Promise(r => setTimeout(r, 0)).then(() => $(`relic_bank_${args.player_id}_${num}`).classList.remove("hidden"));
        await this.animationManager.slideIn($(`relic_bank_${args.player_id}_${num}`), $(`overall_player_board_${args.player_id}`), { duration: 500 });
        await new Promise(r => setTimeout(r, 500));
    }
    notif_buyCardStart(args = null) {
        this.shopStock.setSelectionMode("single");
        this.bga.statusBar.addActionButton("Confirm", () => {
            this.bga.actions.performAction('actBuyCard', { id: this.shopStock.getSelection()[0].id });
        }, { disabled: true, id: "confirm_buy" });
    }
    async notif_buyCard(args) {
        this.shopStock.setSelectionMode("none");
        let numLeft = args.num;
        switch (args.updatePlace) {
            case "bank":
                for (let i = 4; i >= 0; i--) {
                    if ($(`turnip_wrap_${args.player_id}_${i}`).children.length > 0 && numLeft > 0) {
                        await this.animationManager.slideOutAndDestroy($(`turnip_bank_${args.player_id}_${i}`), $(`overall_player_board_${args.player_id}`), { duration: 200 });
                    }
                }
                break;
            case "stockpile":
                for (let i = 0; i < numLeft; i++) {
                    await this.animationManager.slideOutAndDestroy($(`turnip_stockpile_${args.player_id}_${$(`stockpile_${args.player_id}`).children.length - 1}`), $(`overall_player_board_${args.player_id}`), { duration: 200 });
                }
                break;
        }
        if (this.player_id == args.player_id) {
            await this.handStock.addCard(args.card);
            await this.handStock.addCard({ id: args.card.id, type: args.card.type, player_id: args.player_id.toString(), name: args.card.name }, { duration: 0 });
            await this.handStock.removeCard(args.card);
        }
        else {
            await this.voidStock.addCard(args.card);
        }
        await new Promise(r => setTimeout(r, 500));
    }
    async notif_drawNewShop(args) {
        await this.shopStock.addCard(args.card, { fromStock: this.voidStock, initialSide: "back", finalSide: "front" });
        await new Promise(r => setTimeout(r, 500));
    }
    async notif_drawCard(args) {
        let card = args._private.new_card;
        await this.handStock.addCard(card, { fromStock: this.voidStock, initialSide: "back", finalSide: "front" });
        await this.handStock.addCard({ name: card.name, id: card.id, type: card.type, player_id: args.player_id.toString() }, { duration: 0 });
        await this.handStock.removeCard(card);
        await new Promise(r => setTimeout(r, 500));
    }
    async notif_reset(args) {
        for (let player_id of this.gamedatas.playerorder) {
            player_id = player_id.toString();
            if (player_id == this.player_id.toString()) {
                await this.handStock.addCards(this.exhaustedStocks[player_id].getCards());
            }
            else {
                await this.voidStock.addCards(this.exhaustedStocks[player_id].getCards());
            }
            let curArgs = args[0].filter(arg => arg.player_id == player_id);
            await this.exhaustedStocks[player_id].addCards(curArgs);
            if (player_id == this.player_id.toString()) {
                await this.handStock.addCards(this.leftRightStocks[player_id].left.getCards().filter(card => !curArgs.map(arg => arg.id).includes(card.id)));
                await this.handStock.addCards(this.leftRightStocks[player_id].right.getCards().filter(card => !curArgs.map(arg => arg.id).includes(card.id)));
            }
            else {
                await this.leftRightStocks[player_id].left.removeAll({ slideTo: $(`overall_player_board_${player_id}`) });
                await this.leftRightStocks[player_id].right.removeAll({ slideTo: $(`overall_player_board_${player_id}`) });
            }
        }
        this.handStock.setSelectionMode("single");
        await new Promise(r => setTimeout(r, 500));
    }
    async notif_chooseMerchantStart(args) {
        this.bga.statusBar.setTitle("${you} must choose which merchant to activate first");
        this.leftRightStocks[this.player_id].left.setSelectionMode("single");
        this.leftRightStocks[this.player_id].right.setSelectionMode("single");
        this.leftRightStocks[this.player_id].left.onSelectionChange = (selection, lastChange) => {
            if (selection.length > 0) {
                this.leftRightStocks[this.player_id].right.unselectAll();
                if ($('confirm_merchant'))
                    $('confirm_merchant').disabled = false;
            }
            else {
                if ($('confirm_merchant'))
                    $('confirm_merchant').disabled = true;
            }
        };
        this.leftRightStocks[this.player_id].right.onSelectionChange = (selection, lastChange) => {
            if (selection.length > 0) {
                this.leftRightStocks[this.player_id].left.unselectAll();
                if ($('confirm_merchant'))
                    $('confirm_merchant').disabled = false;
            }
            else {
                if ($('confirm_merchant'))
                    $('confirm_merchant').disabled = true;
            }
        };
        this.bga.statusBar.addActionButton("Confirm", () => {
            this.bga.actions.performAction("actChooseMerchant", { "side": this.leftRightStocks[this.player_id].left.getSelection().length > 0 ? "left" : "right" });
            this.leftRightStocks[this.player_id].left.setSelectionMode("none");
            this.leftRightStocks[this.player_id].right.setSelectionMode("none");
        }, { disabled: true, id: "confirm_merchant" });
    }
    notif_test(args) {
        console.log(args);
    }
}

export { Game };
