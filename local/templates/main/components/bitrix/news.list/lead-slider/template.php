<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
    use App\Model\Lead;

    $list = Lead::getAll($arResult['ITEMS']);
    $isFirst = true;
?>
<div class="lead-slider">
    <? foreach ($list as $item) : ?>
        <?
            $itemClass = $isFirst ? 'active' : '';
            $isFirst = false;
        ?>
        <div class="lead-slider__item <?= $itemClass; ?>"></div>
    <? endforeach; ?>
</div>