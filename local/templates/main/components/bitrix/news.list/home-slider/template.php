<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    $items = $arResult['MODELS'];
    $itemsCount = 0;
?>
<div class="home-slider">
    <div class="home-slider__slides-wrapper">
        <div class="home-slider__slides-container">
            <div class="home-slider__slides" id="homeSlider" data-autoplay="3000" data-effect="change">
                <? foreach ($items as $item) : ?>
                    <?
                        $itemClass = $itemsCount === 0 ? 'active' : '';
                        $itemId = 'homeSlider'.$item->id;
                        
                        $itemsCount += 1;
                    ?>
                    <div
                        class="home-slider__slide <?= $itemClass; ?>"
                        id="<?= $itemId; ?>"
                        ></div>
                <? endforeach; ?>
            </div>
            <div class="home-slider__effect"></div>
        </div>
        <script type="text/javascript">
            !(function() {
                var box = document.querySelector('.home-slider__slides');

                var fn = function() {
                    var width = box.clientWidth;
                    box.style.height = width + 'px';
                };

                window.addEventListener('resize', fn);
                fn();
            })();
        </script>
    </div>
    <div class="home-slider__dots" data-dots="homeSlider" data-effect="next">
        <? for ($i = 0; $i < $itemsCount; $i++) : ?>
            <?
                $itemClass = $i === 0 ? 'active' : '';
            ?>
            <button
                class="home-slider__dot <?= $itemClass; ?>"
                type="button"
                ></button>
        <? endfor; ?>
    </div>
</div>