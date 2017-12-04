<?php
namespace App\Model;

/**
 * Модель контакта.
 */
class Contact
{
    /**
     * Тип контакта. Возможные значения:
     * 'phone', 'address', 'email', 'facebook', 'vk', 'instagram', 'id-vk', 'id-facebook'
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
     * Широта.
     *
     * @var string
     */
    public $latitude;

    /**
     * Долгота.
     *
     * @var string
     */
    public $longitude;

    /**
     * Подпись на маркере.
     *
     * @var string
     */
    public $marker;

    /**
     * Имя пользователя Вконтакте или Facebook.
     *
     * @var string
     */
    public $user;

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
        $isEmail = preg_match('/.+@.+/', $this->link);

        $isIdFacebook = ($data['PARAMS']['MESSAGE'] ?? '') === 'FACEBOOK';
        $isIdVk = ($data['PARAMS']['MESSAGE'] ?? '') === 'VK';

        $isAny = [$isPhone, $isEmail, $isFacebook, $isInstagram, $isVk, $isIdVk, $isIdFacebook];
        $isAddress = true;

        foreach ($isAny as $value)
        {
            if (!$value) continue;

            $isAddress = false;
            break;
        }

        if ($isPhone)
        {
            $this->link = preg_replace('/\s+/', '', $this->link);
            $this->link = 'tel:'.$this->link;
            $this->type = 'phone';
        }
        else if ($isEmail)
        {
            $this->link = 'mailto:'.$this->link;
            $this->type = 'email';
        }
        else if ($isAddress)
        {
            $this->type = 'address';
            $this->marker = $data['PARAMS']['MARKER'] ?? 'Мы здесь!';
            $this->latitude = $data['PARAMS']['LATITUDE'] ?? 0;
            $this->longitude = $data['PARAMS']['LONGITUDE'] ?? 0;
            $this->link = $data['PARAMS']['LINK'] ?? '#';
        }
        else if ($isIdVk || $isIdFacebook)
        {
            $this->type = $isIdVk ? 'id-vk' : 'id-facebook';
            $this->user = $this->link;

            $this->link = $isIdFacebook
                ? 'https://www.messenger.com/t/'.$this->user 
                : 'https://vk.me/'.$this->user;
        }
        else
        {
            $this->classes[] = 'soc';
            $this->text = '';
        }

        if ($isFacebook)
        {
            $this->classes[] = 'soc--facebook';
            $this->type = 'facebook';
        }

        if ($isVk)
        {
            $this->classes[] = 'soc--vk';
            $this->type = 'vk';
        }

        if ($isInstagram)
        {
            $this->classes[] = 'soc--instagram';
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

    /**
     * Получает перечисление моделей из выдачи компонента по списку их типов.
     *
     * @param  array     $list  Список пунктов меню из компонента.
     * @param  array     $types Список типов контактов.
     * @return Generator        Перечисление моделей.
     */
    public function getCustom(array $list, array $types)
    {
        $items = self::getAll($list);
        $index = [];

        foreach ($items as $item)
        {
            $index[$item->type] = $item;
        }

        foreach ($types as $type)
        {
            $item = $index[$type];
            yield $item;
        }
    }
}