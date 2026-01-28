class Game {

    public bga: Bga<VillagePillageGamedatas>;
    private gamedatas: VillagePillageGamedatas;

    constructor(bga: Bga<VillagePillageGamedatas>) {
        this.bga = bga;
    }
    
    public setup(gamedatas: VillagePillageGamedatas) {
        this.gamedatas = gamedatas; 
        this.setupNotifications();
    } 
    public setupNotifications() {}
}