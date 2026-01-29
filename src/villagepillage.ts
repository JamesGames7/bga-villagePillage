export class Game {
    public bga: Bga<VillagePillageGamedatas>;
    private gamedatas: VillagePillageGamedatas;

    constructor(bga: Bga<VillagePillageGamedatas>) {
        this.bga = bga;
    }
    
    public setup(gamedatas: VillagePillageGamedatas) {
        this.gamedatas = gamedatas;
        this.setupNotifications();

        Object.entries(gamedatas.players).forEach(el => {
            let info: VillagePillagePlayer = el[1];

            $('game_play_area').insertAdjacentHTML("beforeend", /*html*/`
                <div id="player_area_${info.id}" class="player_area whiteblock">
                    <div id="player_area_name" class="player_area_name">${this.bga.players.getFormattedPlayerName(parseInt(info.id))}</div>
                    <div id="bank-${info.id}" class="bank"></div>
                </div>
            `)
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