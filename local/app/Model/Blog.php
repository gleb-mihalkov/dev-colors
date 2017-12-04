<?php
namespace App\Model;

/**
 * Модель "Новости и события".
 */
class Blog extends PicturedNews
{
    /**
     * Запись даты.
     *
     * @var string
     */
    public $date;

    /**
     * Человекопонятная запись даты.
     *
     * @var string
     */
    public $dateRu;

    /**
     * Источник изображения.
     *
     * @var string
     */
    public $imageSource;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные из компонента новостей.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);
        
        $date = self::getDate($data['DATE_ACTIVE_FROM']);
        $this->date = $date->format('Y-m-d');

        $this->dateRu = $date->format('d')
            .' '.GetMessage('MONTH_'.$date->format('m').'_S')
            .' '.$date->format('Y');

        $this->imageSource = 'неизвестен';
    }
}