<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\Template;
    use App\Model\Blog;

    $model = new Blog($arResult);

    Template::setCache($this, $arResult, 'MODEL', $model);