const BgaAnimations = await globalThis.importEsmLib('bga-animations', '1.x');
const BgaCards = await globalThis.importEsmLib('bga-cards', '1.x');

class CardsManager extends BgaCards.Manager {
    constructor(game) {
        super({
            getId: (card) => card.id,
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
        this.bga = bga;
    }
    setup(gamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();
        let currentPlayerId = this.bga.players.getCurrentPlayerId();
        // @ts-ignore
        let playerOrder = gamedatas.playerorder;
        while (gamedatas.playerorder[0] != currentPlayerId) {
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
            console.log(info);
        });
        $(`game_play_area`).insertAdjacentHTML("beforeend", `<div id="hand"></div>`);
        this.handStock = new BgaCards.HandStock(this.cardManager, $('hand'), { sort: this.sortFunction });
        gamedatas.hand.forEach(card => {
            this.handStock.addCard({ name: card.name, id: card.id, type: Types[card.type] });
        });
        $(`game_play_area`).insertAdjacentHTML("afterbegin", `<div id="shop"></div>`);
        this.shopStock = new BgaCards.LineStock(this.cardManager, $('shop'), { sort: this.sortFunction });
        gamedatas.shop.forEach(card => {
            this.shopStock.addCard({ name: card.name, id: card.id, type: Types[card.type] });
        });
    }
    sortFunction(a, b) {
        let order = [Types.Farmer, Types.Wall, Types.Raider, Types.Merchant];
        return order.indexOf(a.type) - order.indexOf(b.type);
    }
    onEnteringState(stateName, args) {
    }
    onLeavingState(stateName) {
    }
    onUpdateActionButtons(stateName, args) {
    }
    setupNotifications() { }
}

export { Game };
