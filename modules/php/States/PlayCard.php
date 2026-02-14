<?php

declare(strict_types=1);

namespace Bga\Games\VillagePillage\States;

use Bga\GameFramework\Actions\CheckAction;
use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\VillagePillage\Game;

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

        $leftCard = array_values(array_filter($possibleCards, fn($card) => $card["type_arg"] == $leftId));
        $rightCard = array_values(array_filter($possibleCards, fn($card) => $card["type_arg"] == $rightId));

        if (count($leftCard) > 0 && (count($rightCard) > 0 || ($this->game->getPlayersNumber() == 2 && !$this->globals->get("firstRound", true)))) {
            $this->game->cards->moveCard($leftCard[0]["id"], "left", $currentPlayerId);
            if (!($this->game->getPlayersNumber() == 2 && !$this->globals->get("firstRound", true))) {
                $this->game->cards->moveCard($rightCard[0]["id"], "right", $currentPlayerId);
            }

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