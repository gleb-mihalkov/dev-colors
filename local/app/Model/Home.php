<?php
namespace App\Model;

/**
 * Модель картинки с главной страницы.
 */
class Home extends News
{
    /**
     * Изображение для экрана монитора.
     *
     * @var string
     */
    public $imageDesktop;

    /**
     * Изображение для экрана планшета.
     *
     * @var string
     */
    public $imageTablet;

    /**
     * Изображение для экрана мобильного.
     *
     * @var string
     */
    public $imageMobile;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные из компонента новостей.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);

        $image = $data['PREVIEW_PICTURE'];
        
        $this->imageDesktop = self::getImageResize($image, 1920);
        $this->imageTable = self::getImageResize($image, 1200);
        $this->imageMobile = self::getImageResize($image, 640);
    }
}