<?php

declare(strict_types=1);

namespace Bga\Games\VillagePillageJames\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\VillagePillageJames\Game;

class RevealCard extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 19,
            type: StateType::GAME,

            // optional
            description: clienttranslate('Revealing cards'),
            transitions: ["" => 20],
            updateGameProgression: false,
            initialPrivate: null,
        );
    }

    public function getArgs(): array
    {
        // the data sent to the front when entering the state
        return [];
    } 

    function onEnteringState() {
        // the code to run when entering the state
        foreach ($this->game->loadPlayersBasicInfos() as $id => $data) {
            $left = array_values(array_filter(array_merge($this->game->CARDS, $this->game->START_CARDS), fn($card) => $card->getId() == array_values($this->game->cards->getCardsInLocation("left", $id))[0]["type_arg"]))[0]->getInfo($id);
            $right = array_values(array_filter(array_merge($this->game->CARDS, $this->game->START_CARDS), fn($card) => $card->getId() == array_values($this->game->cards->getCardsInLocation("right", $id))[0]["type_arg"]))[0]->getInfo($id);

            $this->notify->all("reveal", '${player_name} plays <mark class="${type_1}">${card_1}</mark> and <mark class="${type_2}">${card_2}</mark>', [
                "left" => $left,
                "right" => $right,
                "player_name" => $data["player_name"],
                "player_id" => $id,
                "card_1" => $left["name"],
                "card_2" => $right["name"],
                "type_1" => $left["type"]->value,
                "type_2" => $right["type"]->value,
            ]);
        }
        return "";
    } 
}