<?
    include_once($_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/urlrewrite.php');
    define('SITE_NOT_WORKING', 'Y');
    require($_SERVER['DOCUMENT_ROOT'].'/bitrix/header.php');

    $APPLICATION->SetTitle('Сайт ещё не готов, но мы скоро закончим');
?>
<? $APPLICATION->IncludeComponent('bitrix:menu', 'site-not-working', array(
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
<? require($_SERVER['DOCUMENT_ROOT'].'/bitrix/footer.php'); ?>