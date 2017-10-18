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

        if ($isAdmin) {
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
                <div class="header__item">
                    <a href="/" title="Перейти на главную страницу" class="logo"></a>
                </div>
                <div class="header__item header__item--pulled"></div>
            </header>
        </div>
        <div class="global__item global__item--stretched">
            