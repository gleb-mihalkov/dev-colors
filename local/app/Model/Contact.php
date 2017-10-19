<?php
namespace App\Model;

/**
 * Модель контакта.
 */
class Contact
{
    /**
     * Тип контакта. Возможные значения: 'phone', 'facebook', 'vk', 'instagram'.
     *
     * @var string
     */
    public $type;

    /**
     * Ссылка.
     *
     * @var string
     */
    public $link;

    /**
     * Текст.
     *
     * @var string
     */
    public $text;

    /**
     * Всплывающая подсказка.
     *
     * @var string
     */
    public $title;

    /**
     * Массив классов ссылки.
     *
     * @var array
     */
    public $classes;

    /**
     * Совмещенное имя класса ссылки.
     *
     * @var string
     */
    public $className;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные компонента меню.
     */
    public function __construct(array $data)
    {
        $link = $data['LINK'];
        $link = preg_replace('/^\//', '', $link);

        $this->title = $data['TEXT'];
        $this->link = $link;
        $this->text = $link;
        $this->className = '';
        $this->classes = [];

        $isPhone = preg_match('/^\+7/', $this->link);
        $isFacebook = preg_match('/facebook\./', $this->link);
        $isVk = preg_match('/vk\./', $this->link);
        $isInstagram = preg_match('/instagram\./', $this->link);

        if ($isPhone)
        {
            $this->link = preg_replace('/\s+/', '', $this->link);
            $this->link = 'tel:'.$this->link;
            $this->type = 'phone';
        }
        else
        {
            $this->classes[] = 'link';
            $this->classes[] = 'link--icon';
            $this->text = '';
        }

        if ($isFacebook)
        {
            $this->classes[] = 'link--icon-facebook';
            $this->type = 'facebook';
        }

        if ($isVk)
        {
            $this->classes[] = 'link--icon-vk';
            $this->type = 'vk';
        }

        if ($isInstagram)
        {
            $this->classes[] = 'link--icon-instagram';
            $this->type = 'instagram';
        }

        $this->className = implode(' ', $this->classes);
    }

    /**
     * Получает перечисление моделей из выдачи компонента меню.
     *
     * @param  array     $list Список пунктов из компонента меню.
     * @return Generator       Перечисление моделей.
     */
    public static function getAll(array $list)
    {
        foreach ($list as $data)
        {
            yield new static($data);
        }
    }
}