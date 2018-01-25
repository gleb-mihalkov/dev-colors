<?php
namespace App\Model;

/**
 * Модель текста "О компании".
 */
class Teacher extends PicturedNews
{
    /**
     * Коллекция фотографий в зависимости от фона.
     *
     * @var string
     */
    protected $photos = [];

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные из компонента новости.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);

        $photos = $data['PROPERTIES']['COLOR_PHOTOS'] ?? [];
        $photosValues = $photos['VALUE'] ?: [];
        $photosColors = $photos['DESCRIPTION'] ?: [];
        $photosCount = count($photosValues);

        for ($i = 0; $i < $photosCount; $i++)
        {
            $value = $photosValues[$i];
            $color = $photosColors[$i];

            if (!$value || !$color)
            {
                continue;
            }

            $value = self::getImageResize($value, 2560);

            $this->photos[$color] = $value;
        }
    }

    /**
     * Возвращает адрес изображения учителя, в зависимости от цвета фона.
     *
     * @param  string $color Цвет фона.
     * @return string        Адрес изображения.
     */
    public function getImageForColor(string $color)
    {
        $color = strtolower(trim($color));
        return $this->photos[$color] ?: $this->image;
    }
}