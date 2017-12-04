#!/bin/bash
host_name='hox.timeweb.ru'
user_name='ck28944'
path_name='/home/c/ck28944/public_html/local/templates/shanina'

host_full=$user_name@$host_name:$path_name

scp ./dist/styles.css $host_full/style.css
scp ./dist/styles.min.css $host_full/style.min.css
scp ./dist/scripts.js $host_full/script.js
scp ./dist/scripts.min.js $host_full/script.min.js