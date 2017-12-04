<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Model\Contact;

    $items = Contact::getAll($arResult);

    $address = null;
    $email = null;
    $phone = null;
    $facebook = null;
    $instagram = null;
    $vk = null;

    foreach ($items as $item)
    {
        switch ($item->type)
        {
            case 'phone':
            {
                $phone = $item;
                break;
            }

            case 'facebook':
            {
                $facebook = $item;
                break;
            }

            case 'instagram':
            {
                $instagram = $item;
                break;
            }

            case 'vk':
            {
                $vk = $item;
                break;
            }

            case 'address':
            {
                $address = $item;
                break;
            }

            case 'email':
            {
                $email = $item;
                break;
            }
        }
    }

    $soc = [
        $facebook,
        $vk,
        $instagram
    ];
?>
<section class="contacts-grid">
    <article class="contacts-grid__item">
        <h2 class="contacts-grid__title">Адрес</h2>
        <a
            class="contacts-grid__value"
            title="<?= $address->title; ?>"
            href="<?= $address->link; ?>"
            target="_blank"
            rel="nofollow"
            ><?= $address->text; ?></a>
    </article>
    <article class="contacts-grid__item">
        <h2 class="contacts-grid__title">Телефон</h2>
        <a
            class="contacts-grid__value"
            title="<?= $phone->title; ?>"
            href="<?= $phone->link; ?>"
            target="_blank"
            rel="nofollow"
            ><?= $phone->text; ?></a>
    </article>
    <article class="contacts-grid__item">
        <h2 class="contacts-grid__title">Почта</h2>
        <a
            class="contacts-grid__value"
            title="<?= $email->title; ?>"
            href="<?= $email->link; ?>"
            target="_blank"
            rel="nofollow"
            ><?= $email->text; ?></a>
    </article>
    <article class="contacts-grid__item  contacts-grid__item--soc">
        <h2 class="contacts-grid__title">Соц. сети</h2>
        <div class="contacts-grid__soc-value">
            <? foreach ($soc as $item) : ?>
                <a
                    class="<?= $item->className; ?>"
                    href="<?= $item->link ?>"
                    title="<?= $item->title; ?>"
                    target="_blank"
                    rel="nofollow"
                    ><?= $item->text; ?></a>
            <? endforeach; ?>
        </div>
    </article>
</section>