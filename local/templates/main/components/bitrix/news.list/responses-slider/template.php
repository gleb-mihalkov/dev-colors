<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;
    use App\Model\Response;

    $items = Response::getList($arResult['ITEMS']);
    $itemsCount = count($items);
?>
<section class="responses-slider">
    <h2 class="responses-slider__title">Отзывы наших учеников</h2>
    <div class="responses-slider__items-wrapper">
        <div class="responses-slider__items" id="responsesSlider" data-duration="1000">
            <? for ($i = 0; $i < $itemsCount; $i++) : ?>
                <?
                    $item = $items[$i];
                    $itemClass = new HtmlClass();
                    $itemClass->is($i == 0, 'active');
                ?>
                <div class="responses-slider__item <?= $itemClass; ?>">
                    <article class="response-preview" id="<?= $item->getEditId($this); ?>">
                        <div class="response-preview__aside">
                            <blockquote class="response-preview__quote"><?= $item->desc; ?></blockquote>
                        </div>
                        <div class="response-preview__main">
                            <p class="response-preview__text"><?= $item->text; ?></p>
                            <h3 class="response-preview__title"><?= $item->title; ?></h3>
                            <h4 class="response-preview__subtitle"><?= $item->subtitle; ?></h4>
                        </div>
                    </article>
                </div>
            <? endfor; ?>
        </div>
        <button type="button" class="responses-slider__prev" data-back="responsesSlider"></button>
        <button type="button" class="responses-slider__next" data-next="responsesSlider"></button>
    </div>
</section>