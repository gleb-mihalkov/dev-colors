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
            
        </div>
        <div class="lead__aside lead__aside--right"></div>
    </section>
</main>
<? require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php"); ?>