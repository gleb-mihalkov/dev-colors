<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
    use App\Model\Contact;

    $list = Contact::getAll($arResult);
?>
<nav role="navigation" class="footer-menu">
    <? foreach ($list as $item) : ?>
        <a
            class="footer-menu__item <?= $item->className; ?>"
            href="<?= $item->link; ?>"
            title="<?= $item->title; ?>"
            target="_blank"
            rel="nofollow"
            ><?= $item->text; ?></a>
    <? endforeach; ?>
</nav>