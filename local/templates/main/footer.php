
        </div>
        <div class="global__item">
            <footer class="footer">
                <div class="footer__item">
                    © <?= $footerYear; ?> Краски. Все права защищены.<br>
                    Сайт сделан: <a href="http://more-use.com/">More Use</a>
                </div>
                <div class="footer__item"></div>
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