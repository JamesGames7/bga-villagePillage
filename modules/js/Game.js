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
                // TODO update tooltip
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
                    <div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}</div>
                    <div id="player_contents_${info.id}" class="player_contents">
                        <div id="bank_${info.id}" class="bank"></div>
                        <div id="stockpile_${info.id}" class="stockpile"></div>
                    </div>
                </div>
            `);
            for (let i = 0; i < 5; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/ `<div id="turnip_bank_${info.id}_${i}" class="turnip turnip_${i}"></div>`);
                if (i >= parseInt(info.bank))
                    $(`turnip_bank_${info.id}_${i}`).classList.add("hidden");
            }
            for (let i = 0; i < 3; i++) {
                $(`bank_${info.id}`).insertAdjacentHTML("beforeend", /*html*/ `<div id="relic_bank_${info.id}_${i}" class="relic relic_${i} hidden"></div>`);
            }
            for (let i = 0; i < parseInt(info.stockpile); i++) {
                $(`stockpile_${info.id}`).insertAdjacentHTML("beforeend", /*html*/ `<div id="turnip_stockpile_${info.id}_${i}" class="turnip turnip_stockpile"></div>`);
                $(`turnip_stockpile_${info.id}_${i}`).style.top = Math.random() * 237 + "px";
                $(`turnip_stockpile_${info.id}_${i}`).style.left = Math.random() * 140 + "px";
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
        console.log(gamedatas.test);
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
    notif_test(args) {
        console.log(args);
    }
}

export { Game };
