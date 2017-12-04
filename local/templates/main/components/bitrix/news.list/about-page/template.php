<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Model\About;

    $items = About::getList($arResult['ITEMS']);
    $itemA = $items[0];
    $itemB = $items[1];
    $itemC = $items[2];
    $itemD = $items[3];
    $itemE = $items[4];
?>
<article class="about-page">
    <h1 class="about-page__title">О школе</h1>
    <section class="about-page__group-01" id="<?= $itemA->getEditId($this); ?>">
        <div class="about-page__image-group-01">
            <div
                style="background-image: url(<?= $itemA->image; ?>)"
                class="about-page__image-01"
                ></div>
        </div>
        <div class="about-page__text-01"><?= $itemA->desc; ?></div>
    </section>
    <section class="about-page__group-02" id="<?= $itemB->getEditId($this); ?>">
        <div class="about-page__text-02"><?= $itemB->desc; ?></div>
    </section>
    <section class="about-page__group-03" id="<?= $itemC->getEditId($this); ?>">
        <div class="about-page__text-03"><?= $itemC->desc; ?></div>
    </section>
    <section class="about-page__group-04" id="<?= $itemD->getEditId($this); ?>">
        <div
            style="background-image: url(<?= $itemD->image; ?>)"
            class="about-page__image-04"
            ></div>
        <div class="about-page__text-04"><?= $itemD->desc; ?></div>
    </section>
    <div class="about-page__group-05"></div>
    <section class="about-page__group-06" id="<?= $itemE->getEditId($this); ?>">
        <div class="about-page__image-group-06">
            <div
                style="background-image: url(<?= $itemE->image; ?>)"
                class="about-page__image-06"
                ></div>
        </div>
        <div class="about-page__text-06"><?= $itemE->desc; ?></div>
    </section>
</article>