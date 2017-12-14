<?php
    $items = $arResult['MODELS'];
?>
<style type="text/css">
    <? foreach ($items as $item) : ?>
        <?
            $itemSelector = '#homeSliderSlide'.$item->id;
        ?>
        <?= $itemSelector; ?> {
            background-image: url(<?= $item->image; ?>);
        }
        @media screen and (min-width: 1920px) {
            <?= $itemSelector; ?> {
                background-image: url(<?= $item->imageRetina; ?>);
            }
        }
    <? endforeach; ?>
</style>