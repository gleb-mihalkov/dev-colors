<?
    require($_SERVER["DOCUMENT_ROOT"]."/bitrix/header.php");
    $APPLICATION->SetPageProperty("title", "Главная страница");
    $APPLICATION->SetPageProperty("NOT_SHOW_NAV_CHAIN", "Y");
    $APPLICATION->SetTitle("Главная страница");
?>

<? require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php"); ?>