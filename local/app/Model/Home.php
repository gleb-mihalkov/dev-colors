<?php
namespace App\Model;

use CFile;

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
     * Изображение для широкого экрана.
     *
     * @var string
     */
    public $imageRetina;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные от компонента.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);
        $this->isStatic = self::getProperty($data, 'IS_STATIC');
        $this->imageRetina = self::getProperty($data, 'RETINA');
        $this->imageRetina = CFile::GetPath($this->imageRetina);
    }
}