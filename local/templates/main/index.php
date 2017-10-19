<?
    if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

    global $APPLICATION;
    global $USER;

    $isPanel = true;

    $site = CSite::GetById(SITE_ID)->GetNext();
    $page = $APPLICATION->GetCurPage();

    $isAdmin = $USER->IsAdmin();
    $is404 = defined('ERROR_404') && ERROR_404 == 'Y';
    $isMain = $page === '/';
    
    $siteName = $site['NAME'];

    $APPLICATION->SetAdditionalCSS(SITE_TEMPLATE_PATH.'/style.css');
    $APPLICATION->AddHeadScript(SITE_TEMPLATE_PATH.'/script.js');

    $pageClasses = [];
    if ($isMain) $pageClasses[] = 'main';
    if ($is404) $pageClasses[] = 'not-found';

    $pageClassName = implode(' ', $pageClasses);

    $footerYear = date('Y');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width; initial-scale=1.0">
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
<body class="<?= $pageClassName; ?>">
    <? if ($isPanel && $isAdmin) : ?>
        <div id="panel"><? $APPLICATION->ShowPanel(); ?></div>
    <? endif; ?>
    <div class="global">
        <div class="global__item">
            <header class="header">
                <div class="header__item header__item--fullsized">
                    <a href="/" title="Перейти на главную страницу" class="logo"></a>
                </div>
                <div class="header__item header__item--pulled">
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
        <div class="global__item global__item--stretched">
            #WORK_AREA#
        </div>
        <div class="global__item">
            <footer class="footer">
                <div class="footer__item">
                    © <?= $footerYear; ?> Краски. Все права защищены.<br>
                    Сайт сделан: <a href="http://more-use.com/" rel="nofollow" target="_blank">More Use</a>
                </div>
                <div class="footer__item">
                    <? $APPLICATION->IncludeComponent('bitrix:menu', 'contacts', array(
                        'ROOT_MENU_TYPE' => 'contacts',
                        'MAX_LEVEL' => '1',
                        'CHILD_MENU_TYPE' => 'contacts',
                        'USE_EXT' => 'Y',
                        'DELAY' => 'N',
                        'ALLOW_MULTI_SELECT' => 'Y',
                        'MENU_CACHE_TYPE' => 'N', 
                        'MENU_CACHE_TIME' => '3600', 
                        'MENU_CACHE_USE_GROUPS' => 'Y', 
                        'MENU_CACHE_GET_VARS' => ''
                    )); ?>
                </div>
            </footer>
        </div>
    </div>
    <?
        if (!$isAdmin)
        {
            $APPLICATION->ShowHeadStrings();
            $APPLICATION->ShowHeadScripts();
        }
    ?>
</body>
</html>