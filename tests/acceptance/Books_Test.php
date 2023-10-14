<?php declare(strict_types=1);

namespace App\Tests\acceptance;

use App\Entity\Status;

class Books_Test extends AcceptanceTestBase
{

    public function childSetUp(): void
    {
        $this->load_languages();
    }

    ///////////////////////
    // Tests

    /**
     * @group smoketestbook
     */
    public function test_create_book(): void
    {
        $this->client->request('GET', '/');
        $this->client->clickLink('Create new Text');

        $ctx = $this->getBookContext();
        $updates = [
            'language' => $this->spanish->getLgID(),
            'Title' => 'Hola',
            'Text' => 'Hola. Tengo un gato.',
        ];
        $ctx->updateBookForm($updates);
        $this->client->waitForElementToContain('body', 'Tengo');
        $ctx = $this->getReadingContext();
        $ctx->assertDisplayedTextEquals('Hola/. /Tengo/ /un/ /gato/.', 'book content shown');

        $this->client->request('GET', '/');
        $this->client->waitForElementToContain('body', 'Hola');
        $ctx = $this->getBookContext();
        $ctx->listingShouldContain('Book shown', [ 'Hola; Spanish; ; 4 (0%); ' ]);
    }
    
}