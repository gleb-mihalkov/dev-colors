<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\Template;
    use App\Model\Home;

    $items = Home::getList($arResult['ITEMS']);

    $staticItem = null;
    $temp = [];

    foreach ($items as $item)
    {
        if ($item->isStatic)
        {
            $staticItem = $item;
            continue;
        }

        $temp[] = $item;
    }

    $items = $temp;
    $itemsCount = count($items);

    Template::setCache($this, $arResult, 'MODELS', $items);
    Template::setCache($this, $arResult, 'STATIC', $staticItem);

    ob_start();
    include __DIR__.'/template_style.php';
    $styles = ob_get_contents();
    ob_end_clean();

    Template::setCache($this, $arResult, 'STYLES', $styles);
?>