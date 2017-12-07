<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;
    use App\Helpers\Template;
    use App\Model\Course;

    $items = Course::getList($arResult['ITEMS']);
    $itemsCount = count($items);
?>
<div class="courses-slider">
    <div class="courses-slider__items" id="coursesSlider" data-duration="2750">
        <? for ($i = 0; $i < $itemsCount; $i++) : ?>
            <?
                $item = $items[$i];
                $itemClass = new HtmlClass();
                $itemClass->is($i == 0, 'active');
            ?>
            <div class="courses-slider__item <?= $itemClass; ?>">
                <? Template::show(SITE_TEMPLATE_PATH.'/views/course-preview.php', [
                    'TEMPLATE' => $this,
                    'MODEL' => $item,
                    'SLIDES_COUNT' => $itemsCount,
                    'SLIDE_NUMBER' => $i + 1
                ]); ?>
            </div>
        <? endfor; ?>
    </div>
    <div class="courses-slider__arrows">
        <div class="courses-slider__arrows-container">
            <button type="button" class="courses-slider__prev" data-back="coursesSlider"></button>
            <button type="button" class="courses-slider__next" data-next="coursesSlider"></button>
        </div>
    </div>
</div>