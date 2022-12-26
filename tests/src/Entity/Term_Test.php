<?php

namespace tests\App\Entity;
 
use App\Entity\Term;
use App\Entity\Language;
use PHPUnit\Framework\TestCase;
 
class Term_Test extends TestCase
{

    public function test_cruft_stripped_on_setWord()
    {
        $cases = [
            [ 'hola', 'hola', 'hola' ],
            [ '    hola    ', 'hola', 'hola' ],
            [ "   hola\tGATO\nok", 'hola GATO ok', 'hola gato ok' ],
        ];
        
        foreach ($cases as $c) {
            $t = new Term();
            $t->setText($c[0]);
            $this->assertEquals($t->getText(), $c[1]);
            $this->assertEquals($t->getTextLC(), $c[2]);
        }
    }

    public function test_getWordCount()
    {
        $cases = [
            [ 'hola', 1 ],
            [ '    hola    ', 1 ],
            [ '  hola 	gato', 2 ],
            [ "HOLA\nhay\tgato  ", 3 ]
        ];
        
        foreach ($cases as $c) {
            $t = new Term();
            $t->setText($c[0]);
            $this->assertEquals($t->getWordCount(), $c[1]);

            // If wc is set, it's used.
            $t->setWordCount(17);
            $this->assertEquals($t->getWordCount(), 17, 'override');
        }
    }

    /**
     * @group wordcount
     */
    public function test_getWordCount_punct()
    {
        $cases = [
            [ "  the CAT's pyjamas  ", 4, "the CAT's pyjamas",  "the cat's pyjamas" ],
            [ "A big CHUNK O' stuff", 5, "A big CHUNK O' stuff", "a big chunk o' stuff" ],
            [ "YOU'RE", 2, "YOU'RE", "you're" ],
            [ "...", 0, "...", "..." ]  // should never happen :-)
        ];

        $english = new Language();
        $english->setLgName('English');  // Use defaults for all settings.

        foreach ($cases as $c) {
            $t = new Term();
            $t->setText($c[0]);
            $t->setLanguage($english);
            $this->assertEquals($t->getWordCount(), $c[1]);
            $this->assertEquals($t->getText(), $c[2]);
            $this->assertEquals($t->getTextLC(), $c[3]);
        }
    }

}