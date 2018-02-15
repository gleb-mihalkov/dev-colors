<?
    if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;

    global $APPLICATION;
    global $USER;

    $isPanel = true;

    $site = CSite::GetById(SITE_ID)->GetNext();
    $page = $APPLICATION->GetCurPage();

    $isAdmin = $USER->IsAdmin();
    $is404 = defined('ERROR_404') && ERROR_404 == 'Y';
    $isBanner = defined('SITE_NOT_WORKING') && SITE_NOT_WORKING == 'Y';
    $isService = $is404 || $isBanner;
    $isMain = $page === '/';
    
    $siteName = $site['NAME'];

    $APPLICATION->SetAdditionalCSS(SITE_TEMPLATE_PATH.'/style.css');
    $APPLICATION->AddHeadScript(SITE_TEMPLATE_PATH.'/script.js');

    $pageClass = new HtmlClass();
    $pageClass->is($isService, 'service');
    $pageClass->is($isMain, 'main');

    $footerYear = date('Y');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width; initial-scale=1.0; user-scalable=no">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <link rel="shortcut icon" href="/favicon.ico?v=2">
    <title><?= $APPLICATION->ShowTitle(); ?></title>
    <?
        $APPLICATION->ShowMeta("description", false, false);
        $APPLICATION->ShowMeta("keywords", false, false);
        $APPLICATION->ShowMeta("robots", false, false);

        $APPLICATION->ShowCSS(true, false);

        if ($isAdmin)
        {
            $APPLICATION->ShowHeadStrings();
            $APPLICATION->ShowHeadScripts();
        }
    ?>
</head>
<body class="<?= $pageClass; ?>">
    <div class="loader  active" id="loader">
        <div class="loader__inner">
            <div class="loader__progress"></div>
        </div>
    </div>
    <? if ($isPanel && $isAdmin) : ?>
        <div id="panel"><? $APPLICATION->ShowPanel(); ?></div>
    <? endif; ?>
    <div class="global">
        <div class="global__header">
            <header class="header">
                <div class="header__logo">
                    <a href="/" title="<?= $siteName; ?>" class="logo"></a>
                </div>
                <div class="header__menu">
                    <button type="button" class="menu-button" data-modal="menu"></button>
                    <? $APPLICATION->IncludeComponent('bitrix:menu', 'main', array(
                        'ROOT_MENU_TYPE' => 'left',
                        'MAX_LEVEL' => '1',
                        'CHILD_MENU_TYPE' => 'left',
                        'USE_EXT' => 'Y',
                        'DELAY' => 'N',
                        'ALLOW_MULTI_SELECT' => 'Y',
                        'MENU_CACHE_TYPE' => 'N', 
                        'MENU_CACHE_TIME' => '3600', 
                        'MENU_CACHE_USE_GROUPS' => 'Y', 
                        'MENU_CACHE_GET_VARS' => ''
                    )); ?>
                </div>
            </header>
        </div>
        <div class="global__content">
            #WORK_AREA#
        </div>
        <? if (!$isService) : ?>
            <div class="global__footer">
                <footer class="footer">
                    <div class="footer__text">
                        © <?= $footerYear; ?> Краски. Все права защищены.<br>
                        Сайт сделан: <a
                            title="Перейти на сайт разработчика"
                            href="http://more-use.com/"
                            rel="nofollow"
                            target="_blank"
                            >More Use</a>
                    </div>
                    <div class="footer__contacts">
                        <? $APPLICATION->IncludeComponent('bitrix:menu', 'contacts', array(
                            'CONTACTS' => ['phone', 'facebook', 'vk', 'instagram'],
                            'ROOT_MENU_TYPE' => 'contacts',
                            'MAX_LEVEL' => '1',
                            'CHILD_MENU_TYPE' => 'contacts',
                            'USE_EXT' => 'Y',
                            'DELAY' => 'N',
                            'ALLOW_MULTI_SELECT' => 'Y',
                            'MENU_CACHE_TYPE' => 'N', 
                            'MENU_CACHE_TIME' => '3600', 
                            'MENU_CACHE_USE_GROUPS' => 'Y', 
                            'MENU_CACHE_GET_VARS' => '',
                        )); ?>
                    </div>
                </footer>
            </div>
        <? endif; ?>
    </div>
    <? if (!$isService) : ?>
        <div class="modal" data-modal-box="" id="feedback">
            <div class="modal__content">
                <? $APPLICATION->IncludeComponent('bitrix:menu', 'order', array(
                    'ROOT_MENU_TYPE' => 'contacts',
                    'MAX_LEVEL' => '1',
                    'CHILD_MENU_TYPE' => 'contacts',
                    'USE_EXT' => 'Y',
                    'DELAY' => 'N',
                    'ALLOW_MULTI_SELECT' => 'Y',
                    'MENU_CACHE_TYPE' => 'N', 
                    'MENU_CACHE_TIME' => '3600', 
                    'MENU_CACHE_USE_GROUPS' => 'Y', 
                    'MENU_CACHE_GET_VARS' => '',
                )); ?>
            </div>
        </div>
        <div class="menu-modal" data-modal-box="" id="menu">
            <div class="menu-modal__header">
                <div class="menu-modal__logo">
                    <a href="/" title="<?= $siteName; ?>" class="logo"></a>
                </div>
                <button type="button" class="menu-modal__close" data-close=""></button>
            </div>
            <? $APPLICATION->IncludeComponent('bitrix:menu', 'modal', array(
                'ROOT_MENU_TYPE' => 'left',
                'MAX_LEVEL' => '1',
                'CHILD_MENU_TYPE' => 'left',
                'USE_EXT' => 'Y',
                'DELAY' => 'N',
                'ALLOW_MULTI_SELECT' => 'Y',
                'MENU_CACHE_TYPE' => 'N', 
                'MENU_CACHE_TIME' => '3600', 
                'MENU_CACHE_USE_GROUPS' => 'Y', 
                'MENU_CACHE_GET_VARS' => ''
            )); ?>
        </div>
    <? endif; ?>
    <?
        if (!$isAdmin)
        {
            $APPLICATION->ShowHeadStrings();
            $APPLICATION->ShowHeadScripts();
        }
    ?>
</body>
</html>