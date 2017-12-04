<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\Template;
    use App\Model\Blog;

    $items = Blog::getList($arResult['ITEMS']);
    $itemsCount = count($items);
    $itemsLink = Template::getPageLink($arResult);

    if ($itemsCount > 3)
    {
        $itemsCount = 3;
    }

    $isTitle = isset($arParams['NO_TITLE'])
        ? $arParams['NO_TITLE'] === false
        : true;
?>
<div class="blog-grid">
    <? if ($isTitle) : ?>
        <h2 class="blog-grid__title">Новости и события</h2>
    <? endif; ?>
    <div class="blog-grid__items">
        <? for ($i = 0; $i < $itemsCount; $i++) : ?>
            <?
                $item = $items[$i];
            ?>
            <article class="blog-grid__item">
                <div class="blog-small-preview" id="<?= $item->getEditId($this); ?>">
                    <a
                        style="background-image: url(<?= $item->image; ?>)"
                        class="blog-small-preview__image"
                        href="<?= $item->link; ?>"
                        ></a>
                    <h3 class="blog-small-preview__title">
                        <a href="<?= $item->link; ?>"><?= $item->title; ?></a>
                    </h3>
                    <time
                        class="blog-small-preview__date"
                        datetime="<?= $item->date; ?>"
                        ><?= $item->dateRu; ?></time>
                </div>
            </article>
        <? endfor; ?>
    </div>
    <div class="blog-grid__bottom">
        <a href="<?= $itemsLink; ?>" class="blog-grid__button">
            <span>Посмотреть все события</span>
        </a>
    </div>
</div>