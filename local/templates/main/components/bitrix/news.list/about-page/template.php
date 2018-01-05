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
    <section
        class="about-page__group-01"
        id="<?= $itemA->getEditId($this); ?>"
        data-paralax=""
        data-paralax-max="20"
        >
        <div class="about-page__image-group-01  not-viewed">
            <div
                style="background-image: url(<?= $itemA->image; ?>)"
                class="about-page__image-01"
                ></div>
        </div>
        <div class="about-page__text-01  not-viewed">
            <span><span><?= $itemA->desc; ?></span></span>
        </div>
        <div class="about-page__asset-01  not-viewed">
            <span></span>
        </div>
    </section>
    <section
        class="about-page__group-02"
        id="<?= $itemB->getEditId($this); ?>"
        data-paralax=""
        data-paralax-max="20"
        >
        <div class="about-page__text-02  not-viewed">
            <span><span><?= $itemB->desc; ?></span></span>
        </div>
    </section>
    <section
        class="about-page__group-03"
        id="<?= $itemC->getEditId($this); ?>"
        data-paralax=""
        data-paralax-max="20"
        >
        <div class="about-page__text-03  not-viewed">
            <span><span><?= $itemC->desc; ?></span></span>
        </div>
    </section>
    <section
        class="about-page__group-04"
        id="<?= $itemD->getEditId($this); ?>"
        data-paralax=""
        data-paralax-max="20"
        >
        <div
            style="background-image: url(<?= $itemD->image; ?>)"
            class="about-page__image-04  not-viewed"
            ></div>
        <div class="about-page__text-04  not-viewed">
            <span><span><?= $itemD->desc; ?></span></span>
        </div>
    </section>
    <div
        class="about-page__group-05"
        data-paralax=""
        data-paralax-max="20"
        >
        <div class="about-page__asset-line-05  not-viewed"></div>
        <div class="about-page__asset-05  not-viewed">
            <span></span>
        </div>    
    </div>
    <section
        class="about-page__group-06"
        id="<?= $itemE->getEditId($this); ?>"
        data-paralax=""
        data-paralax-max="20"
        >
        <div class="about-page__image-group-06">
            <div
                style="background-image: url(<?= $itemE->image; ?>)"
                class="about-page__image-06  not-viewed"
                ></div>
        </div>
        <div class="about-page__text-06  not-viewed">
            <span><?= $itemE->desc; ?></span>
        </div>
    </section>
</article>