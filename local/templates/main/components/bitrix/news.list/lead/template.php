<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
    use App\Model\Lead;

    $list = Lead::getAll($arResult['ITEMS']);
    $listCount = 0;
    $isFirst = true;
?>
<div class="lead">
    <div class="lead__main">
        <div class="lead-slider">
            <? foreach ($list as $item) : ?>
                <?
                    $itemClass = $isFirst ? 'active' : '';
                    $isFirst = false;
                    $listCount += 1;
                ?>
                <div class="lead-slider__item <?= $itemClass; ?>"></div>
            <? endforeach; ?>
        </div>
    </div>
    <div class="lead__aside lead__aside--left">
        <? $APPLICATION->IncludeComponent('bitrix:menu', 'contacts', array(
            'ROOT_MENU_TYPE' => 'contacts',
            'MAX_LEVEL' => '1',
            'CHILD_MENU_TYPE' => 'contacts',
            'USE_EXT' => 'Y',
            'DELAY' => 'N',
            'ALLOW_MULTI_SELECT' => 'Y',
            'MENU_CACHE_TYPE' => 'N', 
            'MENU_CACHE_TIME' => '3600', 
            'MENU_CACHE_USE_GROUPS' => 'Y', 
            'MENU_CACHE_GET_VARS' => '',

            'CONTACTS' => array('instagram', 'vk', 'facebook'),
            'IS_VERTICAL' => 'Y'
        )); ?>
    </div>
    <div class="lead__aside lead__aside--right">
        <div class="slider-dots">
            <? for ($i = 0; $i < $listCount; $i++) : ?>
                <?
                    $itemClass = $i == 0 ? 'active' : '';
                ?>
                <button type="button" class="slider-dots__item  <?= $itemClass; ?>"></button>
            <? endfor; ?>
        </div>
    </div>
</div>