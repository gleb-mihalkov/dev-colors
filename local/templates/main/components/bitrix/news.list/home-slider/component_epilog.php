<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use Bitrix\Main\Page\Asset;

    $styles = $arResult['STYLES'];
    Asset::getInstance()->addString($styles);