<?
    require($_SERVER["DOCUMENT_ROOT"]."/bitrix/header.php");
    $APPLICATION->SetPageProperty("title", "Главная страница");
    $APPLICATION->SetPageProperty("NOT_SHOW_NAV_CHAIN", "Y");
    $APPLICATION->SetTitle("Главная страница");
?>
<main class="page">
    <section class="page__item  lead">
        <div class="lead__main"></div>
        <div class="lead__aside lead__aside--left">
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
                'MENU_CACHE_GET_VARS' => '',

                'CONTACTS' => array('instagram', 'vk', 'facebook'),
                'IS_VERTICAL' => 'Y'
            )); ?>
        </div>
        <div class="lead__aside lead__aside--right"></div>
    </section>
</main>
<? require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php"); ?>