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
            },
            setupBackDiv: (card, div) => {
                div.style.backgroundImage = `url(${g_gamethemeurl}img/baseCards.jpg)`;
                div.style.backgroundSize = `700% 400%`;
                div.style.backgroundPosition = `-600% 0`;
            },
            cardBorderRadius: "4px",
            // TODO change
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
        // @ts-ignore
        this.animationManager = new BgaAnimations.Manager();
        // @ts-ignore
        this.testStocks = [];
        this.cardManager = new CardsManager(this);
        this.bga = bga;
    }
    setup(gamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();
        // @ts-ignore
        let playerOrder = gamedatas.playerorder;
        while (gamedatas.playerorder[0] != this.bga.players.getCurrentPlayerId()) {
            playerOrder.push(playerOrder.shift());
        }
        let i = 0;
        playerOrder.forEach(id => {
            let info = gamedatas.players[id];
            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/ `
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div id="player_area_name_${info.id}" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}</div>
                    <div id="player_contents_${info.id}" class="player_contents">
                        <div id="bank_${info.id}" class="bank"></div>
                        <div id="test_card_${info.id}" class="test"></div>
                    </div>
                </div>
            `);
            this.testStocks.push(new BgaCards.LineStock(this.cardManager, $(`test_card_${info.id}`)));
            this.testStocks[i].addCard({ name: "test", id: i, type: Types.Farmer });
            i++;
        });
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
