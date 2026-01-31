<?php

declare(strict_types=1);

namespace Bga\Games\VillagePillageJames\States;

use Bga\GameFramework\Actions\CheckAction;
use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\VillagePillageJames\Game;

class PlayCard extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 10,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,

            // optional
            description: clienttranslate('Players are choosing which cards to play'),
            descriptionMyTurn: clienttranslate('${you} must choose which cards to play'),
            transitions: ["" => 19],
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
        $this->gamestate->setAllPlayersMultiactive();
    }   

    #[PossibleAction]
    public function actChooseCards(int $leftId, int $rightId, int $currentPlayerId) {
        $possibleCards = $this->game->cards->getCardsInLocation("hand", $currentPlayerId);

        $leftCard = array_values(array_filter($possibleCards, fn($card) => $card["type_arg"] == $leftId))[0];
        $rightCard = array_values(array_filter($possibleCards, fn($card) => $card["type_arg"] == $rightId))[0];

        if (count($leftCard) > 0 && count($rightCard) > 0) {
            $this->game->cards->moveCard($leftCard["id"], "left", $currentPlayerId);
            $this->game->cards->moveCard($rightCard["id"], "right", $currentPlayerId);

            $this->gamestate->setPlayerNonMultiactive($currentPlayerId, "");
        } else {
            throw new \BgaUserException("Not a valid card. Please submit a bug report.");
        }
    }

    #[PossibleAction]
    #[CheckAction(false)]
    public function actRestartTurn(int $currentPlayerId) {
        $this->gamestate->checkPossibleAction("actRestartTurn");
        $this->game->cards->moveAllCardsInLocation("left", "hand", $currentPlayerId, $currentPlayerId);
        $this->game->cards->moveAllCardsInLocation("right", "hand", $currentPlayerId, $currentPlayerId);

        $this->notify->player($currentPlayerId, "restartTurn", "");

        $this->gamestate->setPlayersMultiactive([$currentPlayerId], "");
    }

    function zombie(int $playerId): string {
        // the code to run when the player is a Zombie
        return "";
    }
}