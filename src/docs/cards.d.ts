import { Types } from "../cards";

export interface Card {
    name: string;
    type: Types;
    id: number;
    player_id: string;
    hidden?: boolean;
}