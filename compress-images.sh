#/bin/bash
TEMPLATE_DIR="./local/templates/main/img"
UPLOAD_DIR="./upload"

find $TEMPLATE_DIR $UPLOAD_DIR -type f \( -name "*.jpg" -o -name "*.JPG" -o -name "*.jpeg" -o -name "*.JPEG" \) \
  -exec jpegoptim -o -t -m89 --all-progressive --strip-all '{}' \;

find $TEMPATE_DIR $UPLOAD_DIR -type f \( -name "*.png" -o -name "*.PNG" \) \
  -exec optipng '{}' \;