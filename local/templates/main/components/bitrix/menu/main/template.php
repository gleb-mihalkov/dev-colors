<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
    $list = $arResult;
?>
<nav role="navigation" class="menu">
    <? foreach ($list as $item) : ?>
        <?
            $itemName = $item['TEXT'];
            $itemLink = $item['LINK'];
        ?>
        <a href="<?= $itemLink; ?>" class="menu__item"><?= $itemName; ?></a>
    <? endforeach; ?>
</nav>