class Game {
    constructor(bga) {
        this.bga = bga;
    }
    setup(gamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();
        Object.entries(gamedatas.players).forEach(el => {
            let info = el[1];
            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/ `
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div id="player_area_name" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}</div>
                    <div id="bank-${info.id}" class="bank"></div>
                </div>
            `);
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
