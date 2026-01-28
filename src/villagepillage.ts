export class Game {
    public bga: Bga<VillagePillageGamedatas>;
    private gamedatas: VillagePillageGamedatas;

    constructor(bga: Bga<VillagePillageGamedatas>) {
        this.bga = bga;
    }
    
    public setup(gamedatas: VillagePillageGamedatas) {
        this.gamedatas = gamedatas; 
        this.setupNotifications();
    } 

    public onEnteringState(stateName: string, args: any) {

    }

    public onLeavingState(stateName: string) {

    }

    public onUpdateActionButtons(stateName: string, args: any) {

    }

    public setupNotifications() {}
}