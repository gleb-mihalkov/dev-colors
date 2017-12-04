<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;

    $id = $arResult['NavNum'];
    $count = $arResult['NavPageCount'];
    $current = $arResult['NavPageNomer'];
    $isExists = $count > 1;

    $itemsLink = $arResult['sUrlPathParams'];
    $itemsLink .= 'PAGEN_'.$id.'=';
?>
<nav role="navigation" class="paging">
    <? for ($i = 1; $i <= $count; $i++) : ?>
        <?
            $itemClass = new HtmlClass();
            $itemClass->is($i == $current, 'active');
            $itemLink = $itemsLink.$i;
        ?>
        <a href="<?= $itemLink; ?>" class="paging__item <?= $itemClass; ?>">
            <span><?= $i; ?></span>
        </a>
    <? endfor; ?>
</nav>