<?php

namespace App\Entity;

use DateTime;
use App\Repository\TextRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TextRepository::class)]
#[ORM\Table(name: 'texts')]
class Text
{

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'TxID', type: Types::SMALLINT)]
    private ?int $TxID = null;

    #[ORM\ManyToOne(targetEntity: 'Language', fetch: 'EAGER')]
    #[ORM\JoinColumn(name: 'TxLgID', referencedColumnName: 'LgID', nullable: false)]
    private ?Language $language = null;

    #[ORM\Column(name: 'TxText', type: Types::TEXT)]
    private string $TxText = '';

    #[ORM\Column(name: 'TxOrder', type: Types::SMALLINT)]
    private int $TxOrder = 1;

    #[ORM\Column(name: 'TxAudioURI', length: 200, nullable: true)]
    private ?string $TxAudioURI = null;

    #[ORM\Column(name: 'TxSourceURI', length: 1000, nullable: true)]
    private ?string $TxSourceURI = null;

    #[ORM\Column(name: 'TxReadDate', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?DateTime $TxReadDate = null;

    #[ORM\Column(name: 'TxArchived')]
    private bool $TxArchived = false;

    #[ORM\ManyToOne(inversedBy: 'Texts')]
    #[ORM\JoinColumn(name: 'TxBkID', referencedColumnName: 'BkID', nullable: false)]
    private ?Book $book = null;

    public function __construct()
    {
    }


    public function getID(): ?int
    {
        return $this->TxID;
    }

    public function getTitle(): string
    {
        $b = $this->getBook();
        $s = "({$this->getOrder()}/{$b->getPageCount()})";
        $t = "{$b->getTitle()} {$s}";
        return $t;
    }

    public function getText(): string
    {
        return $this->TxText;
    }

    public function setText(string $TxText): self
    {
        $this->TxText = $TxText;

        return $this;
    }

    public function getAudioURI(): ?string
    {
        return $this->TxAudioURI;
    }

    public function setAudioURI(?string $TxAudioURI): self
    {
        $this->TxAudioURI = $TxAudioURI;

        return $this;
    }

    public function getSourceURI(): ?string
    {
        return $this->TxSourceURI;
    }

    public function setSourceURI(?string $TxSourceURI): self
    {
        $this->TxSourceURI = $TxSourceURI;

        return $this;
    }

    public function isArchived(): bool
    {
        return $this->TxArchived;
    }

    public function setArchived(bool $TxArchived): self
    {
        $this->TxArchived = $TxArchived;

        return $this;
    }

    public function setOrder(int $n): self
    {
        $this->TxOrder = $n;
        return $this;
    }

    public function getOrder(): int
    {
        return $this->TxOrder;
    }

    public function getLanguage(): ?Language
    {
        return $this->language;
    }

    public function setLanguage(Language $language): self
    {
        $this->language = $language;

        return $this;
    }

    public function parse(): void
    {
        $this->getLanguage()->parse([$this]);
    }

    public function getBook(): ?Book
    {
        return $this->book;
    }

    public function setBook(?Book $book): self
    {
        $this->book = $book;

        return $this;
    }

    public function getReadDate(): ?DateTime
    {
        return $this->TxReadDate;
    }

    public function setReadDate(?DateTime $dt): self
    {
        $this->TxReadDate = $dt;
        return $this;
    }
}
