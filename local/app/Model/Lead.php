<?php
namespace App\Model;

/**
 * Модель изображения слайдера на главной.
 */
class Lead
{
    /**
     * Создает экземпляр класса.
     *
     * @param array $desktop Элемент для монитора.
     * @param array $tablet  Элемент для планшета.
     * @param array $mobile  Элемент для смартфона.
     */
    public function __construct(array $desktop, array $tablet, array $mobile)
    {
        
    }



    /**
     * Получает перечисление моделей из списка компонента новостей.
     *
     * @param  array     $list Список новостей из компонента.
     * @return Generator       Перечисление моделей.
     */
    public static function getAll(array $list)
    {
        $index = [];

        foreach ($list as $item)
        {
            $sort = $item['SORT'] * 1;
            $media = $item['PROPERTIES']['MEDIA']['VALUE'];

            if (!isset($index[$sort]))
            {
                $index[$sort] = [];
            }

            $index[$sort][$media] = $item;
        }

        foreach ($index as $item)
        {
            $desktop = $item['desktop'];
            $tablet = $item['tablet'];
            $mobile = $item['mobile'];

            $model = new static($desktop, $tablet, $mobile);
            yield $model;
        }
    }
}