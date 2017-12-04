<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Model\Contact;

    $items = Contact::getCustom($arResult, ['address']);
    $item = null;

    foreach ($items as $item)
    {
        break;
    }
?>
<div
    data-marker="[<?= $item->latitude; ?>, <?= $item->longitude; ?>]"
    data-zoom="17"
    data-title="<?= $item->marker; ?>"
    id="map"
    ></div>
<script type="text/javascript">
    function initMap() {
        var box = document.getElementById('map');

        var center = box.getAttribute('data-marker');
        center = JSON.parse(center);
        var lat = center[0];
        var lng = center[1];

        var zoom = box.getAttribute('data-zoom') * 1;
        var title = box.getAttribute('data-title');

        var map = new google.maps.Map(box, {
            center: {lat: lat, lng: lng},
            zoom: zoom,
            styles: [
                {
                    "featureType": "administrative",
                    "elementType": "labels.text.fill",
                    "stylers": [
                        {
                            "color": "#444444"
                        }
                    ]
                },
                {
                    "featureType": "landscape",
                    "elementType": "all",
                    "stylers": [
                        {
                            "color": "#f4f4f4"
                        }
                    ]
                },
                {
                    "featureType": "landscape.man_made",
                    "elementType": "all",
                    "stylers": [
                        {
                            "color": "#ac8a8a"
                        },
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "landscape.man_made",
                    "elementType": "geometry.stroke",
                    "stylers": [
                        {
                            "color": "#dedede"
                        },
                        {
                            "visibility": "on"
                        }
                    ]
                },
                {
                    "featureType": "poi",
                    "elementType": "all",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "poi.park",
                    "elementType": "geometry.fill",
                    "stylers": [
                        {
                            "visibility": "on"
                        },
                        {
                            "color": "#e7f3f0"
                        }
                    ]
                },
                {
                    "featureType": "road",
                    "elementType": "all",
                    "stylers": [
                        {
                            "saturation": -100
                        },
                        {
                            "lightness": 45
                        }
                    ]
                },
                {
                    "featureType": "road",
                    "elementType": "labels.icon",
                    "stylers": [
                        {
                            "visibility": "on"
                        }
                    ]
                },
                {
                    "featureType": "road.highway",
                    "elementType": "all",
                    "stylers": [
                        {
                            "visibility": "simplified"
                        }
                    ]
                },
                {
                    "featureType": "road.arterial",
                    "elementType": "labels.text.fill",
                    "stylers": [
                        {
                            "color": "#515151"
                        }
                    ]
                },
                {
                    "featureType": "road.arterial",
                    "elementType": "labels.icon",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "road.local",
                    "elementType": "labels.text.fill",
                    "stylers": [
                        {
                            "color": "#636363"
                        }
                    ]
                },
                {
                    "featureType": "transit",
                    "elementType": "all",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "water",
                    "elementType": "all",
                    "stylers": [
                        {
                            "color": "#d2f0ff"
                        },
                        {
                            "visibility": "on"
                        }
                    ]
                },
                {
                    "featureType": "water",
                    "elementType": "geometry.fill",
                    "stylers": [
                        {
                            "visibility": "on"
                        }
                    ]
                },
                {
                    "featureType": "water",
                    "elementType": "labels.text",
                    "stylers": [
                        {
                            "visibility": "on"
                        }
                    ]
                }
            ]
        });

        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            title: title,
            map: map,
        });

        window.debugMapZoom = function() {
            console.log(map.getZoom());
        };
    }
</script>
<script
    src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCFISwAWcLuLIUwlYpn1PVx2_1bdBIQ4UY&callback=initMap"
    async defer
    ></script>