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
	private $allCards;
	private $cards;
	private $card_info;
	private bool $run_effect = true;

    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 20,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,

            // optional
			descriptionMyTurn: clienttranslate('${you} must choose a card to buy'),
            description: clienttranslate('Resolving card effects'),
            transitions: ["next" => 10, "stay" => 20],
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
		$temp = $this->globals->get("cards");
		if ($temp == null || $temp == []) {
			$this->allCards = array_merge($this->game->CARDS, $this->game->START_CARDS);
			$this->cards = array_merge($this->game->cards->getCardsInLocation("left"), $this->game->cards->getCardsInLocation("right"));
			$this->card_info = array_map(fn($card) => array_values(array_filter($this->allCards, fn($a) => $a->getId() == $card["type_arg"]))[0], array_values($this->cards));
			$this->globals->set("cards", $this->cards);
			$this->globals->set("stoppedCard", -1);
		} else {
			$this->allCards = array_merge($this->game->CARDS, $this->game->START_CARDS);
			$this->cards = $this->globals->get("cards");
			$this->card_info = array_map(fn($card) => array_values(array_filter($this->allCards, fn($a) => $a->getId() == $card["type_arg"]))[0], array_values($this->cards));
		}

		$this->run_effect = $this->globals->get("stoppedCard") == -1 ? true : false;

        if ($this->doEffects($this->globals->get("stoppedCard")) == "done") {
			$this->globals->set("cards", []);
			return "next";
		}
    }   

	private function doEffects(int $card_id = -1) {
		foreach ([Types::Farmer, Types::Wall, Types::Raider, Types::Merchant] as $type) {
            $i = 0;
            $opp_nums = $this->game->getCollectionFromDB("SELECT `player_id`, `stockpile`, `bank` FROM `player`");
            foreach ($this->card_info as $card) {
                $card_deck = $this->cards[$i];
                if ($card->getType() == $type) {
					if ($this->run_effect) {
						$this->globals->set("stoppedCard", $card->getId());
						$this->globals->set("card_name", $card->getName());
						$player_id = $card_deck["location_arg"];
						$opponent_id = $card_deck["location"] == "left" ? $this->game->getPlayerBefore($player_id) : $this->game->getPlayerAfter($player_id);
						$opp_card_deck = array_values(array_merge($this->game->cards->getCardsInLocation($card_deck["location"] == "left" ? "right" : "left", $opponent_id), $this->game->cards->getCardsInLocation("exhausted_" . $card_deck["location"] == "left" ? "right" : "left", $opponent_id)))[0];
						$opp_card = array_values(array_filter($this->allCards, fn($card) => $card->getId() == $opp_card_deck["type_arg"]))[0];
						
						$card_effect = $this->typeToEffect[$opp_card->getType()->value];

						$effect = $card->$card_effect(intval($this->cards[$i]["location_arg"]), $opponent_id, intval($opp_nums[$opponent_id]["stockpile"]), intval($opp_nums[$opponent_id]["bank"]), intval($opp_card_deck["id"]), $opp_card->getName(), $card_deck["location"] == "left" ? "right" : "left");
						
						foreach ($effect as $function => $args) {
							$this->$function($args);
						}
					}
					if ($card_id == $card->getId()) {
						$this->run_effect = true;
					}
                }
                $i++;
            }
        }

		if ($this->run_effect) {
			$this->game->cards->moveAllCardsInLocationKeepOrder("left", "hand");
			$this->game->cards->moveAllCardsInLocationKeepOrder("right", "hand");
			$this->game->cards->moveAllCardsInLocationKeepOrder("exhausted", "hand");

			$this->game->cards->moveAllCardsInLocationKeepOrder("exhausted_left", "exhausted");
			$this->game->cards->moveAllCardsInLocationKeepOrder("exhausted_right", "exhausted");

			$this->notify->all("reset", 'Start of next round', [
				array_values(array_map(fn($card) => array_values(array_filter(array_merge($this->game->CARDS, $this->game->START_CARDS), fn($c) => $c->getId() == $card["type_arg"]))[0]->getInfo($card["location_arg"]), $this->game->cards->getCardsInLocation("exhausted")))
			]);

			return "done";
		}
		return "incomplete";
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

		// FIXME error with 2 raiders and not enough
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
        $player_id = $args["player_id"];
        $opponent_id = $args["opponent_id"];
		$exhausted_card_id = $args["op_card_id"];
		$exhausted_card_name = $args["op_card_name"];
		$side = $args["side"];

		$this->game->cards->moveCard($exhausted_card_id, "exhausted_" . $side, $opponent_id);

		$this->notify->all("exhaust", '${player_name1} exhausts ${player_name2}\'s ${op_card} using ${card_name}', [
			"player_id1" => $player_id,
			"player_name1" => $this->game->getPlayerNameById($player_id),
			"player_id2" => $opponent_id,
			"player_name2" => $this->game->getPlayerNameById($opponent_id),
			"card_name" => $args["card_name"],
			"op_card" => $exhausted_card_name
		]);
    }

    private function buyRelic(array $args): void {
		$player_id = $args["player_id"];
		$relics = intval($this->game->getUniqueValueFromDB("SELECT `relics` FROM `player` WHERE `player_id` = $player_id"));
		$bank = intval($this->game->getUniqueValueFromDB("SELECT `bank` FROM `player` WHERE `player_id` = $player_id"));
		$stockpile = intval($this->game->getUniqueValueFromDB("SELECT `stockpile` FROM `player` WHERE `player_id` = $player_id"));

		switch ($relics) {
			case 0:
				$cost = 8;
				$relics = "first";
				break;
			case 1:
				$cost = 9;
				$relics = "second";
				break;
			case 2:
				$cost = 10;
				$relics = "third";
				break;
			default:
				throw new \BgaUserException("Error, please submit a bug report titled 'buy relic error'");
		}

		if ($bank + $stockpile >= $cost) {
			$stockpileSubtract = min($stockpile, $cost);
			$cost -= $stockpileSubtract;

			$this->game->DbQuery("UPDATE `player` SET `relics` = `relics` + 1, `stockpile` = `stockpile` - $stockpileSubtract, `bank` = `bank` - $cost WHERE `player_id` = $player_id");

			$this->notify->all("relic", '${player_name} bought their ${num} relic using ${card_name}', [
				"player_name" => $this->game->getPlayerNameById($player_id),
				"player_id" => $player_id,
				"num" => $relics,
				"card_name" => $args["card_name"],
				"stock_spent" => $stockpileSubtract,
				"bank_spent" => $cost
			]);
		} else {
			$unable = array_keys($args["unable"])[0];
			$this->$unable(["player_id" => $player_id, "args" => array_values($args["unable"])]);
		}
		// TODO end game if necessary
	}

    public function buyCard(array $args): void {
		$player_id = $args["player_id"];
		$this->run_effect = false;
		$this->globals->set("cost", $args["args"][0]["num"]);
		$this->gamestate->setPlayersMultiactive([$player_id], "stay");
		$this->notify->player($player_id, 'buyCardStart', '', []);
    }

	#[PossibleAction]
	public function actBuyCard(int $id, int $currentPlayerId): void {
		$boughtCard = array_filter($this->game->cards->getCardsInLocation("shop"), fn($card) => $card["type_arg"] == $id);
		if (count($boughtCard) > 0) {
			$this->game->cards->moveCard(array_values($boughtCard)[0]["id"], "hand", $currentPlayerId);

			$cost = $this->globals->get("cost");

			$stockpile = $this->game->getUniqueValueFromDB("SELECT `stockpile` FROM `player` WHERE `player_id` = $currentPlayerId");

			$updatePlace = intval($stockpile) > 0 ? "stockpile" : "bank";

			$this->game->DbQuery("UPDATE `player` SET `$updatePlace` = `$updatePlace` - $cost WHERE `player_id` = $currentPlayerId");

			$this->notify->all("buyCard", '${player_name} bought ${bought_card} for ${num} turnip${plural} using ${card_name}', [
				"player_name" => $this->game->getPlayerNameById($currentPlayerId),
				"player_id" => $currentPlayerId,
				"num" => $cost,
				"updatePlace" => $updatePlace,
				"plural" => $cost == 1 ? "" : "s",
				"bought_card" => array_values($boughtCard)[0]["type"],
				"card_name" => $this->globals->get("card_name"),
				"card" => array_values(array_filter($this->game->CARDS, fn($card) => $card->getId() == $id))[0]->getInfo(0)
			]);

			$newCard = $this->game->cards->getCardOnTop("deck");
			$this->game->cards->pickCardForLocation("deck", "shop");

			$this->notify->all("drawNewShop", '${card_name} enters the shop', [
				"card" => array_values(array_filter($this->game->CARDS, fn($card) => $card->getId() == $newCard["type_arg"]))[0]->getInfo(0),
				"card_name" => array_values(array_filter($this->game->CARDS, fn($card) => $card->getId() == $newCard["type_arg"]))[0]->getName()
			]);

			$this->gamestate->setAllPlayersNonMultiactive("stay");
		} else {
			throw new \BgaUserException("Not a valid card choice.");
		}
	}

    function zombie(int $playerId): string {
        // the code to run when the player is a Zombie
        return "";
    }
}