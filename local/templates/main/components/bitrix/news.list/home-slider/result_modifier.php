<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\Template;
    use App\Helpers\Path;
    use App\Model\Home;

    $items = Home::getList($arResult['ITEMS']);
    $arResult['MODELS'] = $items;

    $stylesTemplate = Path::getRelative(__DIR__.'/template_styles.php');

    $styles = Template::render($stylesTemplate, [
        'MODELS' => $items
    ]);

    Template::setCache($this, $arResult, 'STYLES', $styles);