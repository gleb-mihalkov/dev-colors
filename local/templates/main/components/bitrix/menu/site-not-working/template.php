<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Model\Contact;

    $items = Contact::getCustom($arResult, ['vk']);
    $item = null;

    foreach ($items as $item)
    {
        break;
    }
?>
<div class="service-page">
    <div class="service-page__inner">
        <h1 class="service-page__title">Сайт ещё не готов, но мы скоро закончим</h1>
        <div class="service-page__text">Всю информацию вы можете найти в нашей группе Вконтакте.</div>
        <div class="service-page__bottom">
            <a href="<?= $item->link; ?>" class="service-page__link">
                <span>В группу ВК</span>
            </a>
        </div>
    </div>
</div>