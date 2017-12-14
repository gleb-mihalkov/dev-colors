
        </div>
        <? if (!$isService) : ?>
            <div class="global__footer">
                <footer class="footer">
                    <div class="footer__text">
                        © <?= $footerYear; ?> Краски. Все права защищены.<br>
                        Сайт сделан: <a
                            title="Перейти на сайт разработчика"
                            href="http://more-use.com/"
                            rel="nofollow"
                            target="_blank"
                            >More Use</a>
                    </div>
                    <div class="footer__contacts">
                        <? $APPLICATION->IncludeComponent('bitrix:menu', 'contacts', array(
                            'CONTACTS' => ['phone', 'facebook', 'vk', 'instagram'],
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
                        )); ?>
                    </div>
                </footer>
            </div>
        <? endif; ?>
    </div>
    <? if (!$isService) : ?>
        <div class="modal" data-modal-box="" id="feedback">
            <div class="modal__content">
                <? $APPLICATION->IncludeComponent('bitrix:menu', 'order', array(
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
                )); ?>
            </div>
        </div>
        <div class="menu-modal" data-modal-box="" id="menu">
            <div class="menu-modal__header">
                <div class="menu-modal__logo">
                    <a href="/" title="<?= $siteName; ?>" class="logo"></a>
                </div>
                <button type="button" class="menu-modal__close" data-close=""></button>
            </div>
            <? $APPLICATION->IncludeComponent('bitrix:menu', 'modal', array(
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
    <? endif; ?>
    <?
        if (!$isAdmin)
        {
            $APPLICATION->ShowHeadStrings();
            $APPLICATION->ShowHeadScripts();
        }
    ?>
</body>
</html>