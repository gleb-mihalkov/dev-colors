<?php
namespace App\Helpers;

/**
 * Содержит набор методов для работы с файловой системой.
 */
class Path
{
    /**
     * Преобразует абсолютный путь в относительный.
     *
     * @param  string $path Абсолютный путь.
     * @return string       Относительный путь.
     */
    public static function getRelative(string $path)
    {
        $length = strlen($_SERVER['DOCUMENT_ROOT']);
        $path = substr($path, $length);
        return $path;
    }
}