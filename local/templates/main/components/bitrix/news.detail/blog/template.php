<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\Template;
    use App\Model\Blog;

    $item = $arResult['MODEL'];
?>
<article class="blog">
    <time datetime="<?= $item->date; ?>" class="blog__date"><?= $item->dateRu; ?></time>
    <h1 class="blog__title"><?= $item->title; ?></h1>
    <div class="blog__share-top">
        <? Template::show(SITE_TEMPLATE_PATH.'/views/share.php', [
            'TYPE' => 'buttons',
            'TITLE' => $item->title,
            'TEXT' => $item->desc,
            'IMAGE' => $item->image
        ]); ?>
    </div>
    <figure class="blog__image-group">
        <span
            style="background-image: url(<?= $item->image; ?>)"
            class="blog__image  not-viewed"
            ></span>
        <figcaption class="blog__image-caption">
            Фото: <?= $item->imageSource; ?>
        </figcaption>
    </figure>
    <div class="blog__text"><?= $item->text; ?></div>
    <div class="blog__share-bottom">
        <? Template::show(SITE_TEMPLATE_PATH.'/views/share.php', [
            'TYPE' => 'default',
            'TITLE' => $item->title,
            'TEXT' => $item->desc,
            'IMAGE' => $item->image
        ]); ?>
    </div>
</article>