<?php

declare(strict_types=1);

namespace Bga\Games\VillagePillageJames\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\VillagePillageJames\Game;

// TODO: Correct values
class ResolveCard extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 20,
            type: StateType::GAME,

            // optional
            description: clienttranslate('${actplayer} must play a card or pass'),
            descriptionMyTurn: clienttranslate('${you} must play a card or pass'),
            transitions: ["" => 10],
            updateGameProgression: false,
            initialPrivate: null,
        );
    }

    public function getArgs(): array
    {
        // the data sent to the front when entering the state
        return [];
    } 

    function onEnteringState(int $activePlayerId) {
        // the code to run when entering the state
        $allCards = array_merge($this->game->CARDS, $this->game->START_CARDS);

        foreach ($this->game->START_CARDS[0]->farmEffect($activePlayerId, 0) as $function => $args) {
            $this->$function($args);
        }

        return "";
    }   

    private function gain(array $args): void {
        $player_id = $args["player_id"];
        $num = $args["num"];

        $this->game->DbQuery("UPDATE `player` SET `stockpile` = `stockpile` + $num WHERE `player_id` = $player_id");

        $this->notify->all("gain", '${player_name} gained ${num} turnips from ${card_name}', [
            "player_id" => $player_id,
            "player_name" => $this->game->getPlayerNameById($player_id),
            "num" => $num,
            "card_name" => $args["card_name"]
        ]);
    }

    private static function bank(int $num, int $player_id): void {

    }

    private static function steal(int $num, int $player_id, int $opponent_id): void {

    }

    private static function exhaust(int $opponent_id): void {

    }

    private static function buyRelic(int $player_id): void {

    }

    private static function buyCard(int $player_id, int $card_id): void {

    }
}