<?php

namespace tests\App\Entity;
 
use App\Entity\Book;
use App\Entity\Language;
use PHPUnit\Framework\TestCase;
 
class Book_Test extends TestCase
{

    private function scenario($fulltext, $maxwords, $expected) {
        $eng = Language::makeEnglish();
        $b = new Book();
        $b->setLanguage($eng);
        $b->setFullText($fulltext, $maxwords);

        $texts = $b->getTexts();
        $actuals = [];
        for ($i = 0; $i < count($texts); $i++) {
            $actuals[] = $texts[$i]->getText();
        }
        $this->assertEquals(
            implode('/', $actuals),
            implode('/', $expected),
            "scen {$maxwords}"
        );
    }


    public function test_create_book_creates_texts()
    {
        $eng = Language::makeEnglish();
        $b = new Book();
        $b->setLanguage($eng);
        $b->setFullText("Here is a dog. And a cat.", 5);

        $texts = $b->getTexts();
        $this->assertEquals(count($texts), 2, "2 texts");
        $this->assertEquals($texts[0]->getText(), "Here is a dog.");
        $this->assertEquals($texts[1]->getText(), "And a cat.");

        $this->assertEquals($b->getWordCount(), 7, "word count");
    }


    public function test_scenarios() {
        $fulltext = "Here is a dog. And a cat.";
        $this->scenario($fulltext, 5, [ "Here is a dog.", "And a cat."]);
        $this->scenario($fulltext, 500, [ "Here is a dog. And a cat."]);
        $this->scenario($fulltext . " And a thing.", 8, [ "Here is a dog. And a cat.", "And a thing."]);
        $this->scenario("Here is a dog.\nAnd a cat.", 500, [ "Here is a dog.\nAnd a cat."]);
    }

}