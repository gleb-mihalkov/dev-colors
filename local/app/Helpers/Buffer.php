<?php
namespace App\Helpers;

/**
 * Содержит методы для управления буферами вывода.
 */
class Buffer
{
    /**
     * Коллекция буферов.
     *
     * @var array
     */
    protected static $buffers = [];

    /**
     * Получает содержимое буфера по его имени.
     *
     * @param  string $name Имя буфера.
     * @return string       Содержимое буфера.
     */
    public static function getContent(string $name)
    {
        if (!isset(self::$buffers[$name]))
        {
            self::$buffers[$name] = '';
        }

        return self::$buffers[$name];
    }

    /**
     * Задает содержимое буфера.
     *
     * @param string $name    Имя буфера.
     * @param string $content Содержимое буфера.
     */
    public static function setContent(string $name, string $content)
    {
        self::$buffers[$name] = $content;
    }

    /**
     * Дополняет указанный буфер строкой.
     *
     * @param  string $name  Имя буфера.
     * @param  string $value Строка.
     * @return void
     */
    public static function append(string $name, string $value)
    {
        $content = self::getContent($name);
        $content .= $value;
        
        self::setContent($name, $content);
    }

    /**
     * Показывает буфер с указанным именем.
     *
     * @param  string $name Имя буфера.
     * @return string       Код показа буфера.
     */
    public static function show(string $name)
    {
        global $APPLICATION;
        return $APPLICATION->AddBufferContent([static::class, 'getContent'], $name);
    }
}