<?php

declare(strict_types=1);

namespace Bga\Games\VillagePillageJames\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\VillagePillageJames\Game;
use Types;

// FIXME - tiebreakers in terms of effects?
class ResolveCard extends GameState
{
    private $typeToEffect = [
        Types::Farmer->value => "farmEffect",
        Types::Wall->value => "wallEffect",
        Types::Raider->value => "raidEffect",
        Types::Merchant->value => "merchantEffect"
    ];

    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 20,
            type: StateType::GAME,

            // optional
            description: clienttranslate('Resolving card effects'),
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

    function onEnteringState() {
        // the code to run when entering the state
        $allCards = array_merge($this->game->CARDS, $this->game->START_CARDS);
        $cards = array_merge($this->game->cards->getCardsInLocation("left"), $this->game->cards->getCardsInLocation("right"));
        $card_info = array_map(fn($card) => array_values(array_filter($allCards, fn($a) => $a->getId() == $card["type_arg"]))[0], array_values($cards));

        foreach ([Types::Farmer, Types::Wall, Types::Raider, Types::Merchant] as $type) {
            $i = 0;
            $opp_nums = $this->game->getCollectionFromDB("SELECT `player_id`, `stockpile`, `bank` FROM `player`");
            foreach ($card_info as $card) {
                $card_deck = $cards[$i];
                if ($card->getType() == $type) {
                    $player_id = $card_deck["location_arg"];
                    $opponent_id = $card_deck["location"] == "left" ? $this->game->getPlayerBefore($player_id) : $this->game->getPlayerAfter($player_id);
                    $opp_card_deck = array_values($this->game->cards->getCardsInLocation($card_deck["location"] == "left" ? "right" : "left", $opponent_id))[0];
                    $opp_card = array_values(array_filter($allCards, fn($card) => $card->getId() == $opp_card_deck["type_arg"]))[0];
                        
                    $card_effect = $this->typeToEffect[$opp_card->getType()->value];

                    $effect = $card->$card_effect(intval($cards[$i]["location_arg"]), $opponent_id, intval($opp_nums[$opponent_id]["stockpile"]), intval($opp_nums[$opponent_id]["bank"]));
                    
                    foreach ($effect as $function => $args) {
                        $this->$function($args);
                    }
                }
                $i++;
            }
        }

        $this->game->cards->moveAllCardsInLocationKeepOrder("left", "hand");
        $this->game->cards->moveAllCardsInLocationKeepOrder("right", "hand");

        return "";
    }   

    private function gain(array $args): void {
        $player_id = $args["player_id"];
        $num = $args["num"];

        $this->game->DbQuery("UPDATE `player` SET `stockpile` = `stockpile` + $num WHERE `player_id` = $player_id");

        $this->notify->all("gain", '${player_name} gains ${num} turnip${plural} using ${card_name}', [
            "player_id" => $player_id,
            "player_name" => $this->game->getPlayerNameById($player_id),
            "num" => $num,
            "card_name" => $args["card_name"],
            "plural" => $num == 1 ? "" : "s"
        ]);
    }

    private function bank(array $args): void {
        $player_id = $args["player_id"];
        $num = $args["num"];

        $curBanked = $this->game->getUniqueValueFromDB("SELECT `bank` FROM `player` WHERE `player_id` = $player_id");
        $curStockpile = $this->game->getUniqueValueFromDB("SELECT `stockpile` FROM `player` WHERE `player_id` = $player_id");

        $realNum = min(5 - $curBanked, min($num, $curStockpile));

        $this->game->DbQuery("UPDATE `player` SET `stockpile` = `stockpile` - $realNum WHERE `player_id` = $player_id");
        $this->game->DbQuery("UPDATE `player` SET `bank` = `bank` + $realNum WHERE `player_id` = $player_id");

        $this->notify->all("bank", '${player_name} banks ${num} turnip${plural} using ${card_name}', [
            "player_id" => $player_id,
            "player_name" => $this->game->getPlayerNameById($player_id),
            "num" => $realNum,
            "card_name" => $args["card_name"],
            "plural" => $realNum == 1 ? "" : "s"
        ]);
    }

    private function steal(array $args): void {
        $player_id = $args["player_id"];
        $opponent_id = $args["opponent_id"];
        $num = $args["num"];
        $opponent_stock = $args["opponent_stock"];

        // TODO pass boolean that checks for if can steal from banked
        $opponent_bank = $args["opponent_bank"];

        $realNum = min($num, $opponent_stock);

        $this->game->DbQuery("UPDATE `player` SET `stockpile` = `stockpile` - $realNum WHERE `player_id` = $opponent_id");
        $this->game->DbQuery("UPDATE `player` SET `stockpile` = `stockpile` + $realNum WHERE `player_id` = $player_id");

        $this->notify->all("steal", '${player_name1} steals ${num} turnip${plural} from ${player_name2} using ${card_name}', [
            "player_id1" => $player_id,
            "player_name1" => $this->game->getPlayerNameById($player_id),
            "player_id2" => $opponent_id,
            "player_name2" => $this->game->getPlayerNameById($opponent_id),
            "num" => $realNum,
            "card_name" => $args["card_name"],
            "plural" => $realNum == 1 ? "" : "s"
        ]);
    }

    private function exhaust(array $args): void {

    }

    private function buyRelic(array $args): void {

    }

    private function buyCard(array $args): void {

    }
}