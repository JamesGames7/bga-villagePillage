<?php

use Bga\GameFramework\GameState;
use Bga\GameFramework\Notify;
use Bga\Games\VillagePillageJames\Game;

enum Types: string {
    case Raider = "Raider";
    case Wall = "Wall";
    case Farmer = "Farmer";
    case Merchant = "Merchant";
}

class Card {
    private string $name;
    private Types $type;
    private int $id;

    private array $farmEffects;
    private array $wallEffects;
    private array $raidEffects;
    private array $merchantEffects;

    public function __construct(string $name, Types $type, int $id, array $farmEffects = [], array $wallEffects = [], array $raidEffects = [], array $merchantEffects = []) {
        $this->name = $name;
        $this->type = $type;
        $this->id = $id;

        $this->farmEffects = $farmEffects;
        $this->raidEffects = $raidEffects;
        $this->wallEffects = $wallEffects;
        $this->merchantEffects = $merchantEffects;
    }

    public function getName() {
        return $this->name;
    }

    public function getType() {
        return $this->type;
    }

    public function getId() {
        return $this->id;
    }

    public function getInfo(string | int $player_id) {
        return ["name" => $this->name, "type" => $this->type, "id" => $this->id, "player_id" => strval($player_id)];
    }

    public function farmEffect(int $player_id, int $opponent_id) {
        $args = ["player_id" => $player_id, "opponent_id" => $opponent_id, "card_name" => $this->getName()];
        $res = [];
        foreach ($this->farmEffects as $function => $passArgs) {
            $res[$function] = array_merge($args, $passArgs);
        }
        return $res;
    }

    public function wallEffect(int $player_id, int $opponent_id) {
        $args = ["player_id" => $player_id, "opponent_id" => $opponent_id, "card_name" => $this->getName()];
        $res = [];
        foreach ($this->wallEffects as $function => $passArgs) {
            $res[$function] = array_merge($args, $passArgs);
        }
        return $res;
    }

    public function raidEffect(int $player_id, int $opponent_id) {
        $args = ["player_id" => $player_id, "opponent_id" => $opponent_id, "card_name" => $this->getName()];
        $res = [];
        foreach ($this->raidEffects as $function => $passArgs) {
            $res[$function] = array_merge($args, $passArgs);
        }
        return $res;
    }

    public function merchantEffect(int $player_id, int $opponent_id) {
        $args = ["player_id" => $player_id, "opponent_id" => $opponent_id, "card_name" => $this->getName()];
        $res = [];
        foreach ($this->merchantEffects as $function => $passArgs) {
            $res[$function] = array_merge($args, $passArgs);
        }
        return $res;
    }
}