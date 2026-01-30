<?php

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

    public function __construct(string $name, Types $type, int $id) {
        $this->name = $name;
        $this->type = $type;
        $this->id = $id;
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
}