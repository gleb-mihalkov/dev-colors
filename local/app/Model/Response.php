<?php
namespace App\Model;

/**
 * Модель отзыва.
 */
class Response extends News
{
    /**
     * Подзаголовок.
     *
     * @var string
     */
    public $subtitle;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные, которые пришли от компонента news.list.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);
        $this->text = strip_tags($this->text);
        $this->subtitle = self::getProperty($data, 'SUBTITLE');
    }
}