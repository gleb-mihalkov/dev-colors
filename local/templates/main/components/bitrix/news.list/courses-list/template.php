<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\Template;
    use App\Model\Course;

    $items = Course::getList($arResult['ITEMS']);
    $itemsCount = count($items);
?>
<div class="courses-list">
    <h1 class="courses-list__title">Курсы макияжа</h1>
    <div class="courses-list__items">
        <? for ($i = 0; $i < $itemsCount; $i++) : ?>
            <?
                $item = $items[$i];
            ?>
            <div class="courses-list__item">
                <? Template::show(SITE_TEMPLATE_PATH.'/views/course-preview.php', [
                    'IS_INVERTED' => $i % 2 !== 0,
                    'TEMPLATE' => $this,
                    'MODEL' => $item
                ]); ?>
            </div>
        <? endfor; ?>
    </div>
</div>