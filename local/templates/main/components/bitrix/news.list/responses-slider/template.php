<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Model\Response;

    $items = Response::getList($arResult['ITEMS']);
?>
<section class="responses-slider">
    <h2 class="responses-slider__title">Отзывы наших учеников</h2>
    <div class="responses-slider__items" id="responsesSlider">
        <? foreach ($items as $item) : ?>
            <div class="responses-slider__item">
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
        <? endforeach; ?>
    </div>
</section>