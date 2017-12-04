<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Model\Contact;

    $items = Contact::getAll($arResult);
    $phone = null;
    $vk = null;
    $facebook = null;

    foreach ($items as $item)
    {
        switch ($item->type)
        {
            case 'phone':
            {
                $phone = $item;
                break;
            }

            case 'id-vk':
            {
                $vk = $item;
                break;
            }

            case 'id-facebook':
            {
                $facebook = $item;
                break;
            }
            
            default:
            {
                continue;
            }
        }
    }
?>
<button type="button" class="modal__close" data-close=""></button>
<h2 class="modal__title">Записаться на курс</h2>
<div class="modal__text">
    Напишите на какой курс вы бы хотели записаться и на какое время.
</div>
<div class="modal__buttons">
    <a
        title="<?= $vk->title; ?>"
        href="<?= $vk->link; ?>"
        target="_blank"
        rel="nofollow"
        class="modal__vk"
        >
        <span><?= $vk->title; ?></span>
    </a>
    <a
        title="<?= $facebook->title; ?>"
        href="<?= $facebook->link; ?>"
        target="_blank"
        rel="nofollow"
        class="modal__fb"
        >
        <span><?= $facebook->title; ?></span>
    </a>
</div>
<div class="modal__dots">***</div>
<div class="modal__text">
    Лучше если вы нам напишете, но можно и позвонить.<br>
    <strong>
        <a
            href="<?= $phone->link; ?>"
            title="<?= $phone->title; ?>"
            rel="nofollow"
            target="_blank"
            ><?= $phone->text; ?></a>
    </strong>
</div>