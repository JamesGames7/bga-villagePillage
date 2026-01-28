class Game {
    constructor(bga) {
        this.bga = bga;
    }
    setup(gamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();
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
