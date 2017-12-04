<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
    
    use App\Model\About;

    $item = new About($arResult);
?>
<article class="about-preview">
    <h2 class="about-preview__title"><?= $item->title; ?></h2>
    <div class="about-preview__text"><?= $item->desc; ?></div>
    <a href="<?= $item->link; ?>" class="about-preview__link">
        <span>Читать полностью</span>
    </a>
</article>