<?php
namespace App\Model;

/**
 * Cтатья с изображением.
 */
class PicturedNews extends News
{
    /**
     * Изображение статьи.
     *
     * @var string
     */
    public $image;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные из компонента новости.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);

        $this->image = $data['PREVIEW_PICTURE'];
        $this->image = self::getImageResize($this->image, 1024);
    }
}