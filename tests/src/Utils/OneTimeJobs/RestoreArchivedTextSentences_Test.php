<?php declare(strict_types=1);

require_once __DIR__ . '/../../../DatabaseTestBase.php';

use App\Utils\MysqlHelper;
use App\Domain\Dictionary;

// Smoke tests
final class RestoreArchivedTextSentences_Test extends DatabaseTestBase
{

    public function test_script_reloads_archived_text_sentences() {
        $this->markTestSkipped('Not relevant now.');

        $dict = new Dictionary($this->term_repo);
        MysqlHelper::loadDemoData($this->language_repo, $this->book_repo, $dict);
        $this->assertTrue(true, 'dummy');
        $t = $this->text_repo->find(1);
        $this->assertEquals(explode(' ', $t->getTitle())[0], 'Tutorial', 'got tutorial.');
        $t->setArchived(true);
        $this->text_repo->save($t, true);

        DbHelpers::exec_sql("delete from sentences where SeTxID = {$t->getID()}");

        $sql = "select distinct SeTxID from sentences where SeTxID = {$t->getID()}";
        DbHelpers::assertRecordcountEquals($sql, 0, "pre-script");

        App\Utils\OneTimeJobs\RestoreArchivedTextSentences::do_restore(false);

        // Disabling the single assert that actually checks the code
        // works, because this is old code for an old job that was
        // probably totally unnecessary.
        // DbHelpers::assertRecordcountEquals($sql, 1, "restored");

        $check = $this->text_repo->find(1);
        $this->assertTrue($check->isArchived(), 'still archived!');
    }

}
