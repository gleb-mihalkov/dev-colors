
        </div>
        <div class="global__item">
            <footer class="footer">
                <div class="footer__item">
                    © <?= $footerYear; ?> Краски. Все права защищены.<br>
                    Сайт сделан: <a href="http://more-use.com/" rel="nofollow" target="_blank">More Use</a>
                </div>
                <div class="footer__item">
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
                        'MENU_CACHE_GET_VARS' => ''
                    )); ?>
                </div>
            </footer>
        </div>
    </div>
    <?
        if (!$isAdmin)
        {
            $APPLICATION->ShowHeadStrings();
            $APPLICATION->ShowHeadScripts();
        }
    ?>
</body>
</html>