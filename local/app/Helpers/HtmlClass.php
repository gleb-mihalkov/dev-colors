<?php
namespace App\Helpers;

/**
 * Коллекция имен html-классов.
 */
class HtmlClass
{
    /**
     * Список классов.
     *
     * @var array
     */
    protected $classes = [];

    /**
     * Добавляет новый класс.
     *
     * @param string $name Имя класса.
     */
    public function add(string $name)
    {
        if (in_array($name, $this->classes))
        {
            return;
        }

        $this->classes[] = $name;
    }

    /**
     * Если первый параметр true, то добавляет новый класс.
     *
     * @param  bool   $cond Условие добавления класса.
     * @param  string $name Имя класса.
     * @return void
     */
    public function is(bool $cond, string $name)
    {
        if (!$cond || in_array($name, $this->classes))
        {
            return;
        }

        $this->classes[] = $name;
    }

    /**
     * Возвращает строку, содержащую список классов.
     *
     * @return string Список классов.
     */
    public function __toString()
    {
        return implode(' ', $this->classes);
    }
}