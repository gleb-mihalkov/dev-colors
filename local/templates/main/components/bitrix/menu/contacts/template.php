<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
    use App\Model\Contact;

    $isVertical = isset($arParams['IS_VERTICAL'])
        ? $arParams['IS_VERTICAL'] == 'Y'
        : false;
    $types = isset($arParams['CONTACTS'])
        ? $arParams['CONTACTS']
        : null;

    $listClass = $isVertical ? 'contacts--vertical' : '';

    $list = isset($types)
        ? Contact::getCustom($arResult, $types)
        : Contact::getAll($arResult);    
?>
<nav role="navigation" class="contacts <?= $listClass; ?>">
    <? foreach ($list as $item) : ?>
        <a
            class="contacts__item <?= $item->className; ?>"
            href="<?= $item->link; ?>"
            title="<?= $item->title; ?>"
            target="_blank"
            rel="nofollow"
            ><?= $item->text; ?></a>
    <? endforeach; ?>
</nav>