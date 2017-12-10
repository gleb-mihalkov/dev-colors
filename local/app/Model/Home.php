<?php
namespace App\Model;

/**
 * Модель картинки с главной страницы.
 */
class Home extends PicturedNews
{
    /**
     * Показывает, является ли слайд статическим.
     *
     * @var bool
     */
    public $isStatic;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные от компонента.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);
        $this->isStatic = self::getProperty($data, 'IS_STATIC');
    }
}