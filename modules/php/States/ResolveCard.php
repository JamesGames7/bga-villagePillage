<?php

declare(strict_types=1);

namespace Bga\Games\VillagePillage\States;

use Bga\GameFramework\NotificationMessage;
use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\VillagePillage\Game;
use Types;

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
	private $stealRemainder = [];

    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 20,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,

            // optional
			descriptionMyTurn: clienttranslate('${you} must choose a card to buy'),
            description: clienttranslate('Resolving card effects'),
            transitions: ["next" => 10, "stay" => 20, "end" => 98],
            updateGameProgression: false,
            initialPrivate: null,
        );
    }

    public function getArgs(): array
    {
        // the data sent to the front when entering the state
        return [
			"choosingMerchant" => $this->globals->get("choosingMerchant", false),
			"playedCards" => array_merge($this->game->cards->getCardsInLocation("left"), $this->game->cards->getCardsInLocation("right"))
		];
    } 

    function onEnteringState() {
        // the code to run when entering the state
		$this->globals->set("firstRound", false);

		$temp = $this->globals->get("cards");
		if ($temp == null || $temp == []) {
			$this->allCards = array_merge($this->game->CARDS, $this->game->START_CARDS);
			if ($this->game->getPlayersNumber() > 2) {
				$this->cards = array_merge($this->game->cards->getCardsInLocation("left"), $this->game->cards->getCardsInLocation("right"));
			} else {
				$this->cards = array_values($this->game->cards->getCardsInLocation("right"));
			}
			$this->card_info = array_map(fn($card) => array_values(array_filter($this->allCards, fn($a) => $a->getId() == $card["type_arg"]))[0], array_values($this->cards));
			$this->globals->set("cards", $this->cards);
			$this->globals->set("stoppedCard", -1);

			$this->globals->set("choosingMerchant", false);
			$this->globals->set("firstMerchantSide", "none");
		} else {
			$this->allCards = array_merge($this->game->CARDS, $this->game->START_CARDS);
			$this->cards = $this->globals->get("cards");
			$this->card_info = array_map(fn($card) => array_values(array_filter($this->allCards, fn($a) => $a->getId() == $card["type_arg"]))[0], array_values($this->cards));
		}

		$this->run_effect = $this->globals->get("stoppedCard") == -1 ? true : false;

        if ($this->doEffects($this->globals->get("stoppedCard")) == "done") {
			$this->globals->set("cards", []);

			foreach ($this->game->loadPlayersBasicInfos() as $id => $info) {
				if ($this->bga->playerScore->get($id) == 3) {
					return "end";
				}
			}

			return "next";
		}
    }   

	private function doEffects(int $card_id = -1) {
		$toSort = [];
		for ($i = 0; $i < count($this->cards); $i++) {
			$toSort[] = $this->card_info[$i]->getInfo($this->cards[$i]["location_arg"]);
		}

		foreach ([Types::Farmer, Types::Wall, Types::Raider, Types::Merchant] as $type) {
			$sortNums = [];
			usort($toSort, function ($a, $b) use ($sortNums) {
				$aId = $a["player_id"];
				$bId = $b["player_id"];

				$aTurnips = intval($this->game->getUniqueValueFromDB("SELECT `stockpile` FROM `player` WHERE `player_id` = $aId")) + intval($this->game->getUniqueValueFromDB("SELECT `bank` FROM `player` WHERE `player_id` = $aId"));
				$bTurnips = intval($this->game->getUniqueValueFromDB("SELECT `stockpile` FROM `player` WHERE `player_id` = $bId")) + intval($this->game->getUniqueValueFromDB("SELECT `bank` FROM `player` WHERE `player_id` = $bId"));

				if ($aTurnips == $bTurnips) {
					if (array_key_exists($aTurnips, $sortNums)) {
						if (array_key_exists($bTurnips, $sortNums[$aTurnips])) return $sortNums[$aTurnips][$bTurnips];
					} else {
						$sortNums[$aTurnips] = [];
					}

					$orderNum = [-1, 1][\bga_rand(0, 1)];

					$sortNums[$aTurnips][$bTurnips] = $orderNum;
					$sortNums[$bTurnips][$aTurnips] = $orderNum * -1;

					return $orderNum;
				}
				return $aTurnips - $bTurnips;
			});
            $opp_nums = $this->game->getCollectionFromDB("SELECT `player_id`, `stockpile`, `bank` FROM `player`");
            for ($i = 0; $i < (($this->game->getPlayersNumber() > 2) ? $this->game->getPlayerCount() * 2 : $this->game->getPlayerCount()); $i++) {
				if ($i < $this->game->getPlayerCount() * 2 - 2 && $type == Types::Merchant && $this->game->getPlayersNumber() > 2
					&& $toSort[$i]["player_id"] == $toSort[$i + 1]["player_id"]
					&& $toSort[$i]["type"] == Types::Merchant
					&& $toSort[$i + 1]["type"] == Types::Merchant) {

					$g = $this->globals->get("firstMerchantSide", "none");
					if ($g == "none") {
						$this->chooseMerchant(intval($toSort[$i]["player_id"]));
					} else {
						if (array_values($this->game->cards->getCardsInLocation($g["side"], $g["player_id"]))[0]["type_arg"] != $toSort[$i]["id"]) {
							$temp = $toSort[$i];
							$toSort[$i] = $toSort[$i + 1];
							$toSort[$i + 1] = $temp;
						}
					}
				}
				$card = $toSort[$i];
                $card_deck = array_values(array_filter($this->cards, fn($c) => $c["type_arg"] == $card["id"] && $c["location_arg"] == $card["player_id"]))[0];
                if ($card["type"] == $type) {
					// REVIEW removed  && (($card_id != -1 && $type == Types::Merchant) || $card_id == -1)
					if ($this->run_effect) {
						$this->globals->set("stoppedCard", intval($card_deck["id"]));
						$this->globals->set("card_name", $card["name"]);
						$this->globals->set("card_type", $type->value);
						$player_id = $card_deck["location_arg"];
						$opponent_id = $card_deck["location"] == "left" || $card_deck["location"] == "exhausted_left" ? $this->game->getPlayerBefore($player_id) : $this->game->getPlayerAfter($player_id);
						$opp_card_deck = array_values(array_merge($this->game->cards->getCardsInLocation($card_deck["location"] == "left" ? "right" : "left", $opponent_id), $this->game->cards->getCardsInLocation("exhausted_" . ($card_deck["location"] == "left" ? "right" : "left"), $opponent_id)))[0];
						$opp_card = array_values(array_filter($this->allCards, fn($c) => $c->getId() == $opp_card_deck["type_arg"]))[0];
						
						$card_effect = $this->typeToEffect[$opp_card->getType()->value];

						$cardForEffect = array_values(array_filter(array_merge($this->game->CARDS, $this->game->START_CARDS), fn($c) => $c->getId() == $card["id"]))[0];
						$effect = $cardForEffect->$card_effect(intval($player_id), $opponent_id, intval($opp_nums[$opponent_id]["stockpile"]), intval($opp_nums[$opponent_id]["bank"]), intval($opp_card_deck["id"]), $opp_card->getName(), $card_deck["location"] == "left" ? "right" : "left");
						
						foreach ($effect as $function => $args) {
							$this->$function($args);
						}
					}
					if ($card_id == $card_deck["id"]) {
						$this->run_effect = true;
					}
                }
            }
        }

		if ($this->run_effect) {
			if ($this->game->getPlayersNumber() > 2) {
				$this->game->cards->moveAllCardsInLocationKeepOrder("left", "hand");
				$this->game->cards->moveAllCardsInLocationKeepOrder("right", "hand");
				$this->game->cards->moveAllCardsInLocationKeepOrder("exhausted", "hand");

				$this->game->cards->moveAllCardsInLocationKeepOrder("exhausted_left", "exhausted");
				$this->game->cards->moveAllCardsInLocationKeepOrder("exhausted_right", "exhausted");
			} else {
				$this->game->cards->moveAllCardsInLocationKeepOrder("right", "hand");
				$this->game->cards->moveAllCardsInLocationKeepOrder("exhausted", "hand");
				$this->game->cards->moveAllCardsInLocationKeepOrder("exhausted_right", "exhausted");
				$this->game->cards->moveAllCardsInLocationKeepOrder("left", "right");
			}

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

		if (array_key_exists("swap", $args) && $args["swap"]) {
			$player_id = $args["opponent_id"];
		}

        $this->game->DbQuery("UPDATE `player` SET `stockpile` = `stockpile` + $num WHERE `player_id` = $player_id");

        $this->notify->all("gain", '${player_name} gains ${num} turnip${plural} using <mark class="${type}">${card_name}</mark>', [
			"type" => $this->globals->get("card_type"),
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

        $this->notify->all("bank", '${player_name} banks ${num} turnip${plural} using <mark class="${type}">${card_name}</mark>', [
			"type" => $this->globals->get("card_type"),
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
		$original = $num;
        $opponent_stock = $args["opponent_stock"];

        $opponent_bank = $args["opponent_bank"];

		if (array_key_exists("swap", $args) && $args["swap"]) {
			$temp = $player_id;
			$player_id = $opponent_id;
			$opponent_id = $temp;

			$opponent_stock = $this->game->getUniqueValueFromDB("SELECT `stockpile` FROM `player` WHERE `player_id` = $player_id");
		}

		$opCardDeck = array_values($this->game->cards->getCardsInLocation($args["side"], $args["side"] == "right" ? $this->game->getPlayerBefore($opponent_id) : $this->game->getPlayerAfter($opponent_id)))[0];
		$opCardAgainstDeck = array_values($this->game->cards->getCardsInLocation($args["side"] == "left" ? "right" : "left", $opponent_id))[0];

		$opCard = array_values(array_filter(array_merge($this->game->CARDS, $this->game->START_CARDS), fn($card) => $card->getId() == $opCardDeck["type_arg"]))[0];
		$opCardAgainst = array_values(array_filter(array_merge($this->game->CARDS, $this->game->START_CARDS), fn($card) => $card->getId() == $opCardAgainstDeck["type_arg"]))[0]->getType()->value;

		$fnName = ["Farmer" => "farmEffect", "Wall" => "wallEffect", "Raider" => "raidEffect", "Merchant" => "merchantEffect"];
		$curFn = $fnName[$opCardAgainst];

		$opCardEffects = $opCard->$curFn(0, 0, 0, 0, 0, "", "");
		
		$curCardData = array_values(array_filter(array_merge($this->game->CARDS, $this->game->START_CARDS), fn($card) => $card->getName() == $args["card_name"]))[0];

		if (array_key_exists("steal", $opCardEffects) && $opponent_stock < $opCardEffects["steal"]["num"] + $num && $opCard->getType() == $curCardData->getType()) {			
			$opStealNum = $opCardEffects["steal"]["num"];

			if (!array_key_exists($opponent_id, $this->stealRemainder)) {
				if ($opponent_stock % 2 == 1) {
					if ($opStealNum > $num) {
						$remainder = 0;
					} else if ($num > $opStealNum) {
						$remainder = 1;
					} else {
						$remainder = bga_rand(0, 1);
					}
				} else {
					$remainder = 0;
				}
			} else {
				$remainder = $this->stealRemainder[$opponent_id];
				unset($this->stealRemainder[$opponent_id]);
			}

			$num = floor($opponent_stock / 2);
			$num += $remainder;
			$this->stealRemainder[$opponent_id] = $opponent_stock % 2 == 0 ? 0 : 1 - $remainder;
		}

		if (array_key_exists("fromBank", $args) && $args["fromBank"]) {
			$stockSub = min($num, $opponent_stock);

			$realNum = min($original, $stockSub + $opponent_bank);
			$bankSub = $realNum - $stockSub;
		} else {
			$realNum = array_key_exists("swap", $args) ? $num : min($num, $opponent_stock);

			$stockSub = $realNum;
			$bankSub = 0;
		}

        $this->game->DbQuery("UPDATE `player` SET `stockpile` = `stockpile` - $stockSub WHERE `player_id` = $opponent_id");
        $this->game->DbQuery("UPDATE `player` SET `bank` = `bank` - $bankSub WHERE `player_id` = $opponent_id");
        $this->game->DbQuery("UPDATE `player` SET `stockpile` = `stockpile` + $realNum WHERE `player_id` = $player_id");

        $this->notify->all("steal", '${player_name1} steals ${num} turnip${plural} from ${player_name2} using <mark class="${type}">${card_name}</mark>', [
			"type" => $this->globals->get("card_type"),
            "player_id1" => $player_id,
            "player_name1" => $this->game->getPlayerNameById($player_id),
            "player_id2" => $opponent_id,
            "player_name2" => $this->game->getPlayerNameById($opponent_id),
            "num" => $realNum,
            "card_name" => $args["card_name"],
            "plural" => $realNum == 1 ? "" : "s",
			"stock" => $stockSub,
			"bank" => $bankSub
        ]);
    }
	
	private function exhaust(array $args): void {
        $player_id = $args["player_id"];
        $opponent_id = $args["opponent_id"];
		$exhausted_card_id = $args["op_card_id"];
		$exhausted_card_name = $args["op_card_name"];
		$side = $args["side"];

		$type_op = array_values(array_filter(array_merge($this->game->CARDS, $this->game->START_CARDS), fn($card) => $card->getName() == $exhausted_card_name, ))[0]->getType()->value;
		
		if (array_key_exists("swap", $args) && $args["swap"]) {
			$this->game->cards->moveAllCardsInLocation($side == "left" ? "right" : "left", "exhausted_" . ($side == "left" ? "right" : "left"), $player_id, $player_id);

			$this->notify->all("exhaust", '${player_name1} exhausts <mark class="${type}">${card_name}</mark> using <mark class="${type}">${card_name}</mark>', [
				"type" => $this->globals->get("card_type"),
				"player_id1" => $player_id,
				"player_name1" => $this->game->getPlayerNameById($player_id),
				"card_name" => $args["card_name"],
			]);
		} else {
			$this->game->cards->moveCard($exhausted_card_id, "exhausted_" . $side, $opponent_id);

			$this->notify->all("exhaust", '${player_name1} exhausts ${player_name2}\'s <mark class="${type_op}">${op_card}</mark> using <mark class="${type}">${card_name}</mark>', [
				"type" => $this->globals->get("card_type"),
				"type_op" => $type_op,
				"player_id1" => $player_id,
				"player_name1" => $this->game->getPlayerNameById($player_id),
				"player_id2" => $opponent_id,
				"player_name2" => $this->game->getPlayerNameById($opponent_id),
				"card_name" => $args["card_name"],
				"op_card" => $exhausted_card_name
			]);
		}
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

			$this->notify->all("relic", '${player_name} bought their ${num} relic using <mark class="${type}">${card_name}</mark>', [
				"type" => $this->globals->get("card_type"),
				"player_name" => $this->game->getPlayerNameById($player_id),
				"player_id" => $player_id,
				"num" => $relics,
				"card_name" => $args["card_name"],
				"stock_spent" => $stockpileSubtract,
				"bank_spent" => $cost
			]);

			$this->bga->playerScore->inc($player_id, 1);
		} else {
			foreach ($args["unable"] as $fn => $arg) {
				$this->$fn(array_merge(["player_id" => $player_id], $arg, $args));
			}
		}
	}

    private function buyCard(array $args): void {
		if ($this->game->cards->countCardsInLocation("shop") > 0) {
			$player_id = $args["player_id"];
			$this->run_effect = false;
			$this->globals->set("cost", $args["num"]);
			$this->gamestate->setPlayersMultiactive([$player_id], "stay");
			$this->notify->player($player_id, 'buyCardStart', '', []);
		}
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
			$card = array_values(array_filter($this->game->CARDS, fn($card) => $card->getId() == $id))[0]->getInfo(0);

			$this->notify->all("buyCard", '${player_name} bought <mark class="${type_b}">${bought_card}</mark> for ${num} turnip${plural} using <mark class="${type}">${card_name}</mark>', [
				"type" => $this->globals->get("card_type"),
				"player_name" => $this->game->getPlayerNameById($currentPlayerId),
				"player_id" => $currentPlayerId,
				"num" => $cost,
				"updatePlace" => $updatePlace,
				"plural" => $cost == 1 ? "" : "s",
				"bought_card" => array_values($boughtCard)[0]["type"],
				"card_name" => $this->globals->get("card_name"),
				"card" => $card,
				"type_b" => $card["type"]->value
			]);

			if ($this->game->cards->countCardsInLocation("deck") > 0) {
				$newCard = $this->game->cards->getCardOnTop("deck");
				$this->game->cards->pickCardForLocation("deck", "shop");

				$card = array_values(array_filter($this->game->CARDS, fn($card) => $card->getId() == $newCard["type_arg"]))[0]->getInfo(0);

				$this->notify->all("drawNewShop", '<mark class="${type}">${card_name}</mark> enters the shop', [
					"card" => $card,
					"card_name" => $card["name"],
					"type" => $card["type"]->value
				]);
			}

			$this->gamestate->setAllPlayersNonMultiactive("stay");
		} else {
			throw new \BgaUserException("Not a valid card choice.");
		}
	}

	private function drawCard(array $args): void {
		$player_id = $args["player_id"];

		$newCard = $this->game->cards->getCardOnTop("deck");

		$this->game->cards->pickCardForLocation("deck", "hand", $player_id);

		$new = array_values(array_filter($this->game->CARDS, fn($card) => $card->getId() == $newCard["type_arg"]))[0]->getInfo(0);

		$this->notify->all("drawCard", '${player_name} draws a card using <mark class="${type}">${card_name}</mark>', [
			"type" => $this->globals->get("card_type"),
			"player_name" => $this->game->getPlayerNameById($player_id),
			"player_id" => $player_id,

			"card_name" => $args["card_name"],

			"_private" => [
				$player_id => new NotificationMessage('${player_name} draws <mark class="${_private.type_new}">${_private.new_card_name}</mark> using <mark class="${type}">${card_name}</mark>', [
					"new_card_name" => $newCard["type"],
					"new_card" => $new,
					"type_new" => $new["type"]->value
				])
			]
		]);
	}

	private function chooseMerchant(int $player_id) {
		$this->run_effect = false;
		$this->gamestate->setPlayersMultiactive([$player_id], "stay");
		$this->notify->player($player_id, 'chooseMerchantStart', '', []);
		$this->globals->set("choosingMerchant", true);
	}

	#[PossibleAction]
	public function actChooseMerchant(int $currentPlayerId, string $side) {
		$this->globals->set("firstMerchantSide", ["player_id" => $currentPlayerId, "side" => $side]);

		$this->gamestate->setAllPlayersNonMultiactive("stay");
	}

    function zombie(int $playerId): string {
        // the code to run when the player is a Zombie
        return "";
    }
}