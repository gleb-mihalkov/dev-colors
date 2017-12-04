<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    $items = $arParams['MODELS'];
?>
<style type="text/css">
    <? foreach ($items as $item) : ?>
        <?
            $itemId = 'homeSlider'.$item->id;
            $itemDesktop = $item->imageDesktop;
            $itemTablet = $item->imageTablet;
            $itemMobile = $item->imageMobile;
        ?>

        #<?= $itemId; ?> {
            background-image: url(<?= $itemDesktop; ?>);
        }

        @media screen and (max-width: 1200px) {
            #<?= $itemId; ?> {
                background-image: url(<?= $itemTablet; ?>);
            }
        }

        @media screen and (max-width: 980px) {
            #<?= $itemId; ?> {
                background-image: url(<?= $itemMobile; ?>);
            }
        }
    <? endforeach; ?>
</style>