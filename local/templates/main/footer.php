
        </div>
        <div class="global__item">
            <footer class="footer">
                <div class="footer__item">
                    © <?= $footerYear; ?> Краски. Все права защищены.<br>
                    Сайт сделан: <a href="http://more-use.com/">More Use</a>
                </div>
                <div class="footer__item">
                    <nav role="navigation" class="footer-menu">
                        <a
                            class="footer-menu__item"
                            href="tel:+79205688986   "
                            rel="nofollow"
                            >
                            +7 920 568 89 86
                           </a>
                        <a
                            class="footer-menu__item  link link--icon link--icon-facebook"
                            href="#"
                        ></a>
                        <a
                            class="footer-menu__item  link link--icon link--icon-vk"
                            href="#"
                        ></a>
                        <a
                            class="footer-menu__item  link link--icon link--icon-instagramm"
                            href="#"
                        ></a>
                    </nav>
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