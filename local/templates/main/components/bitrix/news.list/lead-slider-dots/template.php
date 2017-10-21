<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
    use App\Model\Lead;

    $list = Lead::getAll($arResult['ITEMS']);
    $isFirst = true;
?>
<div class="lead-slider-dots">
    <? foreach ($list as $item) : ?>
        <?
            $itemClass = $isFirst ? 'active' : '';
            $isFirst = false;
        ?>
        <button type="button" class="lead-slider-dots__item  <?= $itemClass; ?>"></button>
    <? endforeach; ?>
</div>