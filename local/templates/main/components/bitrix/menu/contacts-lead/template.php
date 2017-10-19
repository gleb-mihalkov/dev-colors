<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    $list = [];

    foreach ($asResult as $item)
    {
        $itemLink = $item['LINK'];
        $itemLink = preg_replace('/^\//', '', $itemLink);
        $itemTitle = '';

        $isPhone = preg_match('/^\+7/', $itemLink);
        $isFacebook = preg_match('/facebook\./', $itemLink);
        $isVk = preg_match('/vk\./', $itemLink);
        $isInstagram = preg_match('/instagram\./', $itemLink);

        if ($isPhone)
        {
            continue;
        }

        $itemClasses = [];
        $itemClasses[] = 'link';
        $itemClasses[] = 'link--icon';

        $itemText = '';

        if ($isFacebook)
        {
            $itemClasses[] = 'link--icon-facebook';
            $itemTitle = 'Мы в Facebook';
        }

        if ($isVk)
        {
            $itemClasses[] = 'link--icon-vk';
            $itemTitle = 'Мы во Вконтакте';
        }

        if ($isInstagram)
        {
            $itemClasses[] = 'link--icon-instagram';
            $itemTitle = 'Мы в Instagram';
        }

        $itemClassName = implode(' ', $itemClasses);

        $list[] = [
            'LINK' => $itemLink,
            'TITLE' => $itemTitle,
            'CLASS_NAME' => $itemClassName
        ];
    }
?>
<nav role="navigation" class="footer-menu">
    <? foreach ($list as $item) : ?>
        <?
            
        ?>
        <a
            class="footer-menu__item <?= $itemClassName; ?>"
            href="<?= $itemLink; ?>"
            title="<?= $itemTitle; ?>"
            target="_blank"
            rel="nofollow"
            ><?= $itemText; ?></a>
    <? endforeach; ?>
</nav>