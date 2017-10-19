<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
    $list = $arResult;
?>
<nav role="navigation" class="footer-menu">
    <? foreach ($list as $item) : ?>
        <?
            $itemLink = $item['LINK'];
            $itemLink = preg_replace('/^\//', '', $itemLink);
            $itemTitle = '';

            $isPhone = preg_match('/^\+7/', $itemLink);
            $isFacebook = preg_match('/facebook\./', $itemLink);
            $isVk = preg_match('/vk\./', $itemLink);
            $isInstagram = preg_match('/instagram\./', $itemLink);

            $itemClasses = [];

            if ($isPhone)
            {
                $itemText = $itemLink;
                $itemLink = preg_replace('/\s+/', '', $itemLink);
                $itemLink = 'tel:'.$itemLink;
                $itemTitle = 'Позвонить нам';
            }
            else
            {
                $itemClasses[] = 'link';
                $itemClasses[] = 'link--icon';
                $itemText = '';
            }

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