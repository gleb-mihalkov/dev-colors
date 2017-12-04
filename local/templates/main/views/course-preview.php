<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;

    $isInverted = $arParams['IS_INVERTED'] ?? false;
    $template = $arParams['TEMPLATE'] ?? null;

    $item = $arParams['MODEL'];
    $itemEditId = $template ? $item->getEditId($template) : null;
    
    $itemClass = new HtmlClass();
    $itemClass->is($isInverted, 'course-preview--inverted');
?>
<article
    <? if ($itemEditId) : ?> id="<?= $itemEditId; ?>" <? endif; ?>
    class="course-preview <?= $itemClass; ?>  not-viewed"
    >
    <div class="course-preview__main">
        <h3 class="course-preview__subtitle"><?= $item->subtitle; ?></h3>
        <h2 class="course-preview__title">
            <a href="<?= $item->link; ?>"><?= $item->title; ?></a>
        </h2>
        <p class="course-preview__text"><?= $item->desc; ?></p>
        <a href="<?= $item->link; ?>" class="course-preview__link">
            <span>Подробнее</span>
        </a>
    </div>
    <a href="<?= $item->link; ?>" class="course-preview__aside">
        <span
            style="background-image: url(<?= $item->image; ?>)"
            class="course-preview__image"
            ></span>
    </a>
</article>