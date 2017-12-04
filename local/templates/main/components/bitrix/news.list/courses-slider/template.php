<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\Template;
    use App\Model\Course;

    $items = Course::getList($arResult['ITEMS']);
    $itemsCount = count($items);
?>
<div class="courses-slider">
    <div class="courses-slider__items" id="coursesSlider">
        <? foreach ($items as $item) : ?>
            <div class="courses-slider__item">
                <? Template::show(SITE_TEMPLATE_PATH.'/views/course-preview.php', [
                    'TEMPLATE' => $this,
                    'MODEL' => $item,
                ]); ?>
            </div>
        <? endforeach; ?>
    </div>
</div>