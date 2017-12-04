<?
    require($_SERVER["DOCUMENT_ROOT"]."/bitrix/header.php");
    $APPLICATION->SetTitle("Контакты");
?>
<div class="contacts-page">
    <h1 class="contacts-page__title">Контакты</h1>
    <div class="contacts-page__text">
        <? $APPLICATION->IncludeFile(SITE_TEMPLATE_PATH.'/content/contacts-text.txt'); ?>
    </div>
    <div class="contacts-page__grid">
        <? $APPLICATION->IncludeComponent('bitrix:menu', 'contacts-grid', array(
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
    <div class="contacts-page__buttons">
        <button
            class="contacts-page__button"
            type="button"
            data-modal="feedback"
            >
            <span>Задать вопрос или записаться на курс</span>
        </button>
    </div>
    <div class="contacts-page__map">
        <? $APPLICATION->IncludeComponent('bitrix:menu', 'map', array(
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
</div>
<? require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php"); ?>