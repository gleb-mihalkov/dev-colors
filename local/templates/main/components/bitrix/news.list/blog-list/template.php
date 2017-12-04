<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;
    use App\Model\Blog;

    $items = Blog::getList($arResult['ITEMS']);
    $itemsCount = count($items);
    $itemsPaging = $arResult['NAV_STRING'];
?>
<div class="blog-list">
    <h1 class="blog-list__title">Новости и события</h1>
    <div class="blog-list__items">
        <? for ($i = 0; $i < $itemsCount; $i++) : ?>
            <?
                $item = $items[$i];
                $itemClass = new HtmlClass();
                $itemClass->is($i % 2 !== 0, 'blog-preview--inverted');
            ?>
            <div class="blog-list__item">
                <a 
                    class="blog-preview <?= $itemClass; ?>  not-viewed"
                    href="<?= $item->link; ?>"
                    id="<?= $item->getEditId($this); ?>"
                    >
                    <span class="blog-preview__aside">
                        <span
                            style="background-image: url(<?= $item->image; ?>)"
                            class="blog-preview__image"
                            href="<?= $item->link; ?>"
                            >
                        </span>
                    </span>
                    <span class="blog-preview__main">
                        <span class="blog-preview__title"><?= $item->title; ?></span>
                        <span class="blog-preview__text"><?= $item->desc; ?></span>
                        <time
                            datetime="<?= $item->date; ?>"
                            class="blog-preview__date"
                            ><?= $item->dateRu; ?></time>
                    </span>
                </a>
            </div>
        <? endfor; ?>
    </div>
    <div class="blog-list__paging">
        <?= $itemsPaging; ?>
    </div>
</div>