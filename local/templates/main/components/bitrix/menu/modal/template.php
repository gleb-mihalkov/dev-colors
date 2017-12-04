<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    $items = $arResult;
?>
<nav role="navigation" class="menu-modal__content">
    <? foreach ($items as $item) : ?>
        <?
            $itemName = $item['TEXT'];
            $itemLink = $item['LINK'];
        ?>
        <a href="<?= $itemLink; ?>" class="menu-modal__item"><?= $itemName; ?></a>
    <? endforeach; ?>
</nav>