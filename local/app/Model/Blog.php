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
     * Массив изображений слайдера.
     *
     * @var array
     */
    public $slides;

    /**
     * Временная переменная.
     *
     * @var string
     */
    public $temp;

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

        $this->imageSource = self::getProperty($data, 'PICTURE_CAPTION');
        if (!$this->imageSource) $this->imageSource = 'неизвестен';

        $this->slides = self::getProperty($data, 'SLIDER');
        if (!$this->slides) $this->slides = [];

        foreach ($this->slides as $i => $id)
        {
            $this->slides[$i] = self::getImageResize($id, 1200);
        }

        $slider = $this->renderSlider();

        $this->text = preg_replace('/<[^>]+>\s*\{slider\}\s*<\/[^>]+>/', '{slider}', $this->text);
        $this->text = str_replace('{slider}', $slider, $this->text);
    }

    /**
     * Генерирует код слайдера.
     *
     * @return string Код слайдера.
     */
    protected function renderSlider()
    {
        $result = '';
        $result .= '<div class="blog-slider  not-viewed">';
        $result .= '<div class="blog-slider__items" id="blogSlider" data-duration="1000">';

        foreach ($this->slides as $i => $slide)
        {
            $result .= '<div class="blog-slider__item '.($i == 0 ? 'active' : '').'">';
            $result .= '<div class="blog-slider__image-wrapper">';
            $result .= '<div class="blog-slider__image" style="background-image: url('.$slide.')">';
            $result .= '</div>';
            $result .= '</div>';
            $result .= '</div>';
        }

        $result .= '</div>';
        $result .= '<div class="blog-slider__arrows">';
        $result .= '<button type="button" class="blog-slider__prev" data-back="blogSlider"></button>';
        $result .= '<button type="button" class="blog-slider__next" data-next="blogSlider"></button>';
        $result .= '</div>';
        $result .= '</div>';

        return $result;
    }
}